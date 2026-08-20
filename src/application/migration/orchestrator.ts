import { v4 as uuid } from 'uuid'
import type { CanonicalEntity, EntityKind } from '@domain/canonical/types'
import type { ConnectionConfig } from '@domain/plugin/types'
import {
  MigrationStages,
  type EntityCounters,
  type MigrationJob,
  type MigrationPreview,
  type MigrationReport,
  type MigrationStage,
  type StageProgress
} from '@domain/migration/types'
import { DetectionFailedError, StageFailedError } from '@domain/errors'
import type { PluginRegistry } from '@application/plugins/plugin-registry'
import { autoFixCanonical } from '@application/migration/auto-fix'
import { sortImportKinds } from '@infrastructure/importer/uniplus-import-columns'
import type { MigrationRepository } from '@infrastructure/db/migration-repository'
import type { DestinationImporter, ImportResult } from '@infrastructure/importer/types'
import type { Logger } from '@infrastructure/logging/logger'
import type { MigrationProgressEvent } from '@shared/ipc'

export type ProgressListener = (event: MigrationProgressEvent) => void

const IMPORT_BATCH_SIZE = 200
const SAMPLE_LIMIT = 20
const WARNING_LIMIT = 100
/** Progresso IPC a cada N registros (menos overhead no preview). */
const EXTRACT_PROGRESS_EVERY = 500

export class MigrationOrchestrator {
  private readonly progressListeners = new Set<ProgressListener>()

  constructor(
    private readonly registry: PluginRegistry,
    private readonly repository: MigrationRepository,
    private readonly importer: DestinationImporter,
    private readonly logger: Logger
  ) {}

  onProgress(listener: ProgressListener): () => void {
    this.progressListeners.add(listener)
    return () => this.progressListeners.delete(listener)
  }

  listPlugins() {
    return this.registry.listMetadata()
  }

  listEmpresas() {
    if (!this.importer.listEmpresas) {
      return Promise.resolve([])
    }
    return this.importer.listEmpresas()
  }

  getJob(jobId: string) {
    return this.repository.getJob(jobId)
  }

  listHistory() {
    return this.repository.listJobs()
  }

  async startPreview(pluginId: string, connection: ConnectionConfig): Promise<MigrationPreview> {
    const plugin = this.registry.get(pluginId)
    const job = this.createJob(pluginId, connection)
    this.repository.saveJob(job, 'none')
    this.repository.setSetting('last.pluginId', pluginId, 'none')
    this.repository.setSetting('last.connection', JSON.stringify(connection), 'none')

    const startedAt = Date.now()
    const writer = this.repository.openStagingWriter(job.id)

    try {
      await this.runStage(job, 'discovery', async () => {
        this.emit(job.id, 'discovery', `Plugin ${plugin.metadata().name} selecionado`)
      })

      await this.runStage(job, 'connection', async () => {
        await plugin.connect(connection)
        this.emit(job.id, 'connection', 'Conexão estabelecida')
      })

      await this.runStage(job, 'detection', async () => {
        const detected = await plugin.detect(connection)
        if (!detected) {
          throw new DetectionFailedError(pluginId)
        }
        this.emit(job.id, 'detection', 'ERP detectado com sucesso')
      })

      const extractStats = await this.runStage(job, 'extraction', async () => {
        const countersMap = new Map<EntityKind, EntityCounters>()
        const sample: CanonicalEntity[] = []
        const warnings: string[] = []
        let read = 0
        let accepted = 0
        let extractTotal: number | undefined
        try {
          if (plugin.countExtractable) {
            const counted = await plugin.countExtractable(connection)
            if (Number.isFinite(counted) && counted >= 0) {
              extractTotal = counted
            }
          }
        } catch (error) {
          this.logger.warn({ err: error }, 'Falha ao contar registros da origem; progresso sem total')
        }
        this.emit(
          job.id,
          'extraction',
          extractTotal != null ? `Lendo ${extractTotal} registros…` : 'Iniciando leitura',
          0,
          extractTotal
        )

        for await (const entity of plugin.extract({ connection })) {
          read += 1
          if (read % EXTRACT_PROGRESS_EVERY === 0) {
            this.emit(job.id, 'extraction', `Lidos ${read} registros`, read, extractTotal)
          }
          const result = plugin.validate(entity)
          if (!result.valid) {
            this.logger.warn({ entity: entity.externalId, issues: result.issues }, 'Entity rejected')
            continue
          }

          const fixed = autoFixCanonical(plugin.transform(entity))
          await writer.append(fixed)
          accepted += 1
          bumpCounter(countersMap, fixed)

          if (sample.length < SAMPLE_LIMIT) {
            sample.push({
              ...fixed,
              payload: slimPreviewPayload(fixed.payload),
              warnings: fixed.warnings.slice(0, 3)
            })
          }
          if (warnings.length < WARNING_LIMIT && fixed.warnings.length > 0) {
            warnings.push(`${fixed.kind}/${fixed.externalId}: ${fixed.warnings[0]}`)
          }
        }

        await writer.close()
        this.emit(
          job.id,
          'extraction',
          `Leitura concluída: ${accepted}/${read} válidos (staging em disco)`,
          read,
          extractTotal ?? read
        )
        return {
          counters: [...countersMap.values()],
          sample,
          warnings,
          accepted
        }
      })

      await this.runStage(job, 'validation', async () => {
        this.emit(job.id, 'validation', `${extractStats.accepted} válidos (streaming)`)
      })
      await this.runStage(job, 'mapping', async () => {
        this.emit(job.id, 'mapping', `${extractStats.accepted} entidades canônicas`)
      })
      await this.runStage(job, 'auto_fix', async () => {
        this.emit(job.id, 'auto_fix', 'Correções automáticas aplicadas')
      })

      const preview = await this.runStage(job, 'preview', async () => {
        job.counters = extractStats.counters
        job.status = 'preview_ready'
        this.touch(job)
        this.repository.saveJob(job, 'none')

        this.emit(job.id, 'preview', 'Pré-visualização pronta', extractStats.accepted, extractStats.accepted)
        return {
          jobId: job.id,
          counters: extractStats.counters,
          sample: extractStats.sample,
          warnings: extractStats.warnings
        } satisfies MigrationPreview
      })

      this.repository.flushPersist()
      await plugin.disconnect?.()
      this.logger.info({ jobId: job.id, ms: Date.now() - startedAt }, 'Preview ready')
      return preview
    } catch (error) {
      await writer.close().catch(() => undefined)
      this.repository.clearStaging(job.id)
      await plugin.disconnect?.().catch(() => undefined)
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : String(error)
      this.touch(job)
      this.repository.saveJob(job, 'immediate')
      this.logger.error({ err: error, jobId: job.id }, 'Preview failed')
      throw error
    }
  }

  async confirmImport(jobId: string, idempresa: string): Promise<MigrationReport> {
    const job = this.repository.getJob(jobId)
    if (!job) {
      throw new StageFailedError('import', `Job não encontrado: ${jobId}`)
    }
    const retryableStatuses = new Set(['preview_ready', 'failed', 'importing'])
    if (!retryableStatuses.has(job.status)) {
      throw new StageFailedError('import', `Job não está pronto para importação: ${job.status}`)
    }
    if (!idempresa?.trim()) {
      throw new StageFailedError('import', 'Selecione a empresa de destino')
    }
    if (!this.repository.hasStaging(jobId)) {
      throw new StageFailedError('import', 'Staging não encontrado para este job')
    }

    // Retry após falha: limpa estágios de import para reexecução
    const importStages = new Set(['import', 'final_validation', 'report', 'history'])
    for (const stage of job.stages) {
      if (importStages.has(stage.stage)) {
        stage.status = 'pending'
        stage.message = undefined
        stage.startedAt = undefined
        stage.finishedAt = undefined
      }
    }
    job.error = undefined

    const startedAt = Date.now()
    job.status = 'importing'
    this.touch(job)
    this.repository.saveJob(job, 'deferred')

    try {
      let importResult: ImportResult = {
        imported: 0,
        byKind: {},
        warnings: [],
        destination: this.importer.getDestinationLabel?.()
      }
      let stagingCount = 0

      await this.runStage(job, 'import', async () => {
        if (this.importer.validateEmpresa) {
          await this.importer.validateEmpresa(idempresa.trim())
        }

        const kindsToImport = sortImportKinds(job.counters.map((c) => c.kind))
        const kindLoop = kindsToImport.length > 0 ? kindsToImport : [null]
        const importTotal = job.counters.reduce((sum, c) => sum + c.total, 0) || undefined
        this.emit(
          job.id,
          'import',
          importTotal != null ? `Importando ${importTotal} registros…` : 'Iniciando importação',
          0,
          importTotal
        )
        for (const kind of kindLoop) {
          const batches =
            kind == null
              ? this.repository.iterateStagingBatches(jobId, IMPORT_BATCH_SIZE)
              : this.repository.iterateStagingOfKind(jobId, kind, IMPORT_BATCH_SIZE)
          for await (const batch of batches) {
            stagingCount += batch.length
            const partial = await this.importer.importAll(jobId, batch, {
              idempresa: idempresa.trim()
            })
            importResult = mergeImportResults(importResult, partial)
            this.emit(
              job.id,
              'import',
              `Importados ${importResult.imported} registros…`,
              importResult.imported,
              importTotal
            )
          }
          if (kind === 'plano_contas') {
            for await (const batch of this.repository.iterateStagingOfKind(
              jobId,
              kind,
              IMPORT_BATCH_SIZE
            )) {
              await this.importer.importAll(jobId, batch, { idempresa: idempresa.trim() })
            }
          }
        }

        this.repository.markStagingImported(jobId)
        const dest = importResult.destination ?? this.importer.getDestinationLabel?.() ?? 'destino'
        this.emit(
          job.id,
          'import',
          `Importados ${importResult.imported} registros em ${dest}`,
          importResult.imported,
          importTotal ?? importResult.imported
        )
        for (const counter of job.counters) {
          counter.imported = importResult.byKind[counter.kind] ?? 0
        }
      })

      await this.runStage(job, 'final_validation', async () => {
        const imported = Object.values(importResult.byKind).reduce((sum, n) => sum + n, 0)
        if (imported !== importResult.imported) {
          throw new StageFailedError(
            'final_validation',
            `Contagem divergente: byKind=${imported}, imported=${importResult.imported}`
          )
        }
        if (stagingCount > 0 && imported === 0) {
          throw new StageFailedError(
            'final_validation',
            'Nenhum registro foi importado para o destino'
          )
        }
        this.emit(job.id, 'final_validation', 'Validação final OK')
      })

      const report = await this.runStage(job, 'report', async () => {
        const durationMs = Date.now() - startedAt
        const dest = importResult.destination ?? this.importer.getDestinationLabel?.() ?? 'destino'
        const warningNote =
          importResult.warnings && importResult.warnings.length > 0
            ? ` (${importResult.warnings.length} avisos)`
            : ''
        const report: MigrationReport = {
          jobId: job.id,
          pluginId: job.pluginId,
          status: 'completed',
          counters: job.counters,
          durationMs,
          summary: `Migração concluída: ${importResult.imported} registros importados em ${dest}.${warningNote}`,
          errors: [],
          createdAt: new Date().toISOString()
        }
        this.emit(job.id, 'report', report.summary)
        return report
      })

      await this.runStage(job, 'history', async () => {
        job.status = 'completed'
        this.touch(job)
        this.repository.saveJob(job, 'none')
        this.repository.saveReport(report)
        this.emit(job.id, 'history', 'Histórico persistido')
      })

      this.repository.flushPersist()
      return report
    } catch (error) {
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : String(error)
      this.touch(job)
      this.repository.saveJob(job, 'immediate')
      this.logger.error({ err: error, jobId }, 'Import failed')
      throw error
    }
  }

  async rollbackJob(jobId: string): Promise<MigrationJob> {
    const job = this.repository.getJob(jobId)
    if (!job) {
      throw new StageFailedError('history', `Job não encontrado: ${jobId}`)
    }
    if (job.status !== 'completed') {
      throw new StageFailedError(
        'history',
        `Rollback disponível apenas para jobs concluídos (status atual: ${job.status})`
      )
    }
    if (!this.importer.rollback) {
      throw new StageFailedError('history', 'Destino atual não suporta rollback')
    }
    if (!this.repository.hasStaging(jobId)) {
      throw new StageFailedError(
        'history',
        'Não há staging salvo para este job; rollback impossível'
      )
    }

    try {
      let deleted = 0
      const byKind: Record<string, number> = {}

      for await (const batch of this.repository.iterateStagingBatches(jobId, IMPORT_BATCH_SIZE)) {
        const result = await this.importer.rollback!(jobId, batch)
        deleted += result.deleted
        for (const [kind, n] of Object.entries(result.byKind)) {
          byKind[kind] = (byKind[kind] ?? 0) + n
        }
      }

      this.repository.markStagingNotImported(jobId)
      for (const counter of job.counters) {
        counter.imported = 0
      }
      job.status = 'rolled_back'
      job.error = undefined
      this.touch(job)
      this.repository.saveJob(job, 'none')
      this.repository.saveReport({
        jobId: job.id,
        pluginId: job.pluginId,
        status: 'rolled_back',
        counters: job.counters,
        durationMs: 0,
        summary: `Rollback concluído: ${deleted} registros removidos do destino.`,
        errors: [],
        createdAt: new Date().toISOString()
      })
      this.repository.flushPersist()
      this.logger.info({ jobId, deleted, byKind }, 'Rollback completed')
      return job
    } catch (error) {
      job.error = error instanceof Error ? error.message : String(error)
      this.touch(job)
      this.repository.saveJob(job, 'immediate')
      this.logger.error({ err: error, jobId }, 'Rollback failed')
      throw error
    }
  }

  private createJob(pluginId: string, connection: ConnectionConfig): MigrationJob {
    const now = new Date().toISOString()
    return {
      id: uuid(),
      pluginId,
      status: 'running',
      connection,
      stages: MigrationStages.map(
        (stage): StageProgress => ({
          stage,
          status: 'pending'
        })
      ),
      counters: [],
      createdAt: now,
      updatedAt: now
    }
  }

  private async runStage<T>(
    job: MigrationJob,
    stage: MigrationStage,
    fn: () => Promise<T>
  ): Promise<T> {
    const progress = job.stages.find((s) => s.stage === stage)
    if (!progress) {
      throw new StageFailedError(stage, 'Stage não encontrado no job')
    }

    progress.status = 'running'
    progress.startedAt = new Date().toISOString()
    progress.message = 'Em andamento'
    if (job.status === 'preview_ready' || job.status === 'importing' || job.status === 'failed') {
      job.status = 'importing'
    } else {
      job.status = 'running'
    }
    this.touch(job)
    this.repository.saveJob(job, 'deferred')
    this.emit(job.id, stage, `Iniciando ${stage}`)

    try {
      const result = await fn()
      progress.status = 'completed'
      progress.finishedAt = new Date().toISOString()
      progress.message = 'Concluído'
      this.touch(job)
      this.repository.saveJob(job, 'deferred')
      return result
    } catch (error) {
      progress.status = 'failed'
      progress.finishedAt = new Date().toISOString()
      progress.message = error instanceof Error ? error.message : String(error)
      this.touch(job)
      this.repository.saveJob(job, 'immediate')
      if (error instanceof StageFailedError || error instanceof DetectionFailedError) {
        throw error
      }
      throw new StageFailedError(stage, error instanceof Error ? error.message : String(error), error)
    }
  }

  private touch(job: MigrationJob): void {
    job.updatedAt = new Date().toISOString()
  }

  private emit(jobId: string, stage: string, message: string, processed = 0, total?: number): void {
    const event: MigrationProgressEvent = { jobId, stage, message, processed, total }
    for (const listener of this.progressListeners) {
      listener(event)
    }
  }
}

function bumpCounter(map: Map<EntityKind, EntityCounters>, entity: CanonicalEntity): void {
  const current = map.get(entity.kind) ?? {
    kind: entity.kind,
    total: 0,
    valid: 0,
    warnings: 0,
    errors: 0,
    imported: 0
  }
  current.total += 1
  current.valid += 1
  if (entity.warnings.length > 0) current.warnings += 1
  map.set(entity.kind, current)
}

function mergeImportResults(acc: ImportResult, partial: ImportResult): ImportResult {
  const byKind = { ...acc.byKind }
  for (const [kind, n] of Object.entries(partial.byKind)) {
    byKind[kind] = (byKind[kind] ?? 0) + n
  }
  const warnings = [...(acc.warnings ?? []), ...(partial.warnings ?? [])].slice(0, 80)
  return {
    imported: acc.imported + partial.imported,
    byKind,
    warnings,
    destination: partial.destination ?? acc.destination
  }
}

function slimPreviewPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload
  const record = payload as Record<string, unknown>
  if (record.columns && typeof record.columns === 'object') {
    const cols = record.columns as Record<string, unknown>
    const keys = Object.keys(cols).slice(0, 12)
    const slim: Record<string, unknown> = {}
    for (const key of keys) slim[key] = cols[key]
    if (Object.keys(cols).length > 12) slim._truncated = true
    return { columns: slim }
  }
  return payload
}
