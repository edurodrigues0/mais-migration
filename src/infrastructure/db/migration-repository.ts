import { eq, desc } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'
import type { AppDatabase } from '@infrastructure/db/client'
import { migrationJobs, migrationReports, settings } from '@database/schema'
import type { CanonicalEntity } from '@domain/canonical/types'
import type { MigrationJob, MigrationReport } from '@domain/migration/types'
import {
  StagingStore,
  type StagingWriter,
  batchAsync
} from '@infrastructure/db/staging-store'

export type PersistMode = 'immediate' | 'deferred' | 'none'

export class MigrationRepository {
  constructor(
    private readonly db: AppDatabase,
    private readonly persistFn: () => void,
    private readonly stagingStore: StagingStore,
    private readonly persistDebouncedFn?: (ms?: number) => void
  ) {}

  openStagingWriter(jobId: string): StagingWriter {
    return this.stagingStore.createWriter(jobId)
  }

  iterateStaging(jobId: string): AsyncGenerator<CanonicalEntity> {
    return this.stagingStore.iterate(jobId)
  }

  iterateStagingBatches(jobId: string, size = 200): AsyncGenerator<CanonicalEntity[]> {
    return batchAsync(this.stagingStore.iterate(jobId), size)
  }

  iterateStagingOfKind(jobId: string, kind: string, size = 200): AsyncGenerator<CanonicalEntity[]> {
    return batchAsync(this.stagingStore.iterateOfKind(jobId, kind), size)
  }

  saveJob(job: MigrationJob, persist: PersistMode = 'deferred'): void {
    const existing = this.db.select().from(migrationJobs).where(eq(migrationJobs.id, job.id)).all()
    if (existing.length === 0) {
      this.db
        .insert(migrationJobs)
        .values({
          id: job.id,
          pluginId: job.pluginId,
          status: job.status,
          connectionJson: JSON.stringify(job.connection),
          stagesJson: JSON.stringify(job.stages),
          countersJson: JSON.stringify(job.counters),
          error: job.error ?? null,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt
        })
        .run()
    } else {
      this.db
        .update(migrationJobs)
        .set({
          status: job.status,
          stagesJson: JSON.stringify(job.stages),
          countersJson: JSON.stringify(job.counters),
          error: job.error ?? null,
          updatedAt: job.updatedAt
        })
        .where(eq(migrationJobs.id, job.id))
        .run()
    }
    this.flush(persist)
  }

  /** Força flush do SQLite para disco (fim de preview/import). */
  flushPersist(): void {
    this.persistFn()
  }

  getJob(jobId: string): MigrationJob | null {
    const rows = this.db.select().from(migrationJobs).where(eq(migrationJobs.id, jobId)).all()
    const row = rows[0]
    if (!row) return null
    return this.mapJob(row)
  }

  listJobs(limit = 50): MigrationJob[] {
    return this.db
      .select()
      .from(migrationJobs)
      .orderBy(desc(migrationJobs.createdAt))
      .limit(limit)
      .all()
      .map((row) => this.mapJob(row))
  }

  clearStaging(jobId: string): void {
    this.stagingStore.clear(jobId)
  }

  /** @deprecated Prefer openStagingWriter + append streaming. Mantido para compat. */
  saveStaging(jobId: string, entities: CanonicalEntity[]): void {
    this.stagingStore.writeAll(jobId, entities)
  }

  listStaging(jobId: string): CanonicalEntity[] {
    return this.stagingStore.listAll(jobId)
  }

  hasStaging(jobId: string): boolean {
    return this.stagingStore.exists(jobId)
  }

  markStagingImported(jobId: string): void {
    this.setSetting(`staging.imported.${jobId}`, '1', 'none')
  }

  markStagingNotImported(jobId: string): void {
    this.setSetting(`staging.imported.${jobId}`, '0', 'none')
  }

  saveReport(report: MigrationReport): void {
    this.db
      .insert(migrationReports)
      .values({
        id: uuid(),
        jobId: report.jobId,
        pluginId: report.pluginId,
        status: report.status,
        countersJson: JSON.stringify(report.counters),
        durationMs: report.durationMs,
        summary: report.summary,
        errorsJson: JSON.stringify(report.errors),
        createdAt: report.createdAt
      })
      .run()
    this.flush('immediate')
  }

  setSetting(key: string, value: string, persist: PersistMode = 'deferred'): void {
    const existing = this.db.select().from(settings).where(eq(settings.key, key)).all()
    if (existing.length === 0) {
      this.db.insert(settings).values({ key, value }).run()
    } else {
      this.db.update(settings).set({ value }).where(eq(settings.key, key)).run()
    }
    this.flush(persist)
  }

  getSetting(key: string): string | null {
    const rows = this.db.select().from(settings).where(eq(settings.key, key)).all()
    return rows[0]?.value ?? null
  }

  private flush(mode: PersistMode): void {
    if (mode === 'none') return
    if (mode === 'immediate') {
      this.persistFn()
      return
    }
    if (this.persistDebouncedFn) {
      this.persistDebouncedFn()
    } else {
      this.persistFn()
    }
  }

  private mapJob(row: typeof migrationJobs.$inferSelect): MigrationJob {
    return {
      id: row.id,
      pluginId: row.pluginId,
      status: row.status as MigrationJob['status'],
      connection: JSON.parse(row.connectionJson),
      stages: JSON.parse(row.stagesJson),
      counters: JSON.parse(row.countersJson),
      error: row.error ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }
  }
}
