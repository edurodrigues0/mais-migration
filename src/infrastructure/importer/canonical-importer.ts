import type { Database } from 'sql.js'
import type { CanonicalEntity } from '@domain/canonical/types'
import type { Logger } from '@infrastructure/logging/logger'
import type {
  DestinationImporter,
  ImportOptions,
  ImportResult,
  RollbackResult
} from '@infrastructure/importer/types'
import type { DestinoEmpresa } from '@shared/ipc'

/**
 * Stub do ERP destino: persiste o modelo canônico em SQLite local.
 * Mantido para testes / fallback sem Postgres.
 */
export class CanonicalImporter implements DestinationImporter {
  constructor(
    private readonly sqlite: Database,
    private readonly logger: Logger,
    private readonly persist: () => void
  ) { }

  getDestinationLabel(): string {
    return 'sqlite://imported_entities'
  }

  async listEmpresas(): Promise<DestinoEmpresa[]> {
    return [{ id: 'local', nome: 'SQLite local (stub)', cnpj: '' }]
  }

  async importAll(
    jobId: string,
    entities: CanonicalEntity[],
    _options: ImportOptions
  ): Promise<ImportResult> {
    const byKind: Record<string, number> = {}
    const now = new Date().toISOString()

    this.sqlite.run('BEGIN')
    try {
      for (const entity of entities) {
        this.sqlite.run(
          `INSERT INTO imported_entities (id, job_id, kind, external_id, source_system, payload_json, imported_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             payload_json = excluded.payload_json,
             imported_at = excluded.imported_at`,
          [
            `${jobId}:${entity.kind}:${entity.externalId}`,
            jobId,
            entity.kind,
            entity.externalId,
            entity.sourceSystem,
            JSON.stringify(entity.payload),
            now
          ]
        )
        byKind[entity.kind] = (byKind[entity.kind] ?? 0) + 1
      }
      this.sqlite.run('COMMIT')
    } catch (error) {
      this.sqlite.run('ROLLBACK')
      throw error
    }

    this.persist()
    this.logger.info({ jobId, count: entities.length, byKind }, 'Canonical import completed')
    return { imported: entities.length, byKind, destination: this.getDestinationLabel() }
  }

  async rollback(jobId: string, _entities: CanonicalEntity[]): Promise<RollbackResult> {
    const byKind: Record<string, number> = {}
    let deleted = 0

    const stmt = this.sqlite.prepare(
      'SELECT kind, COUNT(*) as cnt FROM imported_entities WHERE job_id = ? GROUP BY kind'
    )
    stmt.bind([jobId])
    while (stmt.step()) {
      const row = stmt.getAsObject() as { kind: string; cnt: number }
      byKind[row.kind] = Number(row.cnt)
      deleted += Number(row.cnt)
    }
    stmt.free()

    this.sqlite.run('DELETE FROM imported_entities WHERE job_id = ?', [jobId])
    this.persist()
    this.logger.info({ jobId, deleted, byKind }, 'Canonical rollback completed')
    return { deleted, byKind }
  }
}
