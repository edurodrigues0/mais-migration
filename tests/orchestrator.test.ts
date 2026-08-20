import { describe, expect, it } from 'vitest'
import { createTestOrchestrator } from './helpers/test-app'

describe('MigrationOrchestrator', () => {
  it('runs preview pipeline with demo plugin', async () => {
    const { orchestrator } = await createTestOrchestrator('preview')
    const preview = await orchestrator.startPreview('demo', { source: 'demo://local' })

    expect(preview.jobId).toBeTruthy()
    expect(preview.counters.length).toBeGreaterThan(0)
    expect(preview.sample.length).toBeGreaterThan(0)

    const job = orchestrator.getJob(preview.jobId)
    expect(job?.status).toBe('preview_ready')
  })

  it('imports canonical entities after preview', async () => {
    const { orchestrator } = await createTestOrchestrator('import')
    const preview = await orchestrator.startPreview('demo', { source: 'demo://local' })
    const report = await orchestrator.confirmImport(preview.jobId, 'local')

    expect(report.status).toBe('completed')
    expect(report.counters.reduce((sum, c) => sum + c.imported, 0)).toBeGreaterThan(0)

    const job = orchestrator.getJob(preview.jobId)
    expect(job?.status).toBe('completed')
  })

  it('rolls back a completed import', async () => {
    const { orchestrator } = await createTestOrchestrator('rollback')
    const preview = await orchestrator.startPreview('demo', { source: 'demo://local' })
    await orchestrator.confirmImport(preview.jobId, 'local')

    const rolled = await orchestrator.rollbackJob(preview.jobId)
    expect(rolled.status).toBe('rolled_back')
    expect(rolled.counters.every((c) => c.imported === 0)).toBe(true)
  })

  it('fails detection for invalid source', async () => {
    const { orchestrator } = await createTestOrchestrator('detect-fail')
    await expect(orchestrator.startPreview('demo', { source: 'invalid://x' })).rejects.toThrow(
      /não detectado/i
    )
  })

  it('retries import when job is failed but staging exists', async () => {
    const { orchestrator, repository } = await createTestOrchestrator('retry-failed')
    const preview = await orchestrator.startPreview('demo', { source: 'demo://local' })
    const job = repository.getJob(preview.jobId)
    expect(job).toBeTruthy()
    job!.status = 'failed'
    job!.error = 'fk_notafiscal_representante'
    repository.saveJob(job!, 'immediate')

    expect(repository.hasStaging(preview.jobId)).toBe(true)

    const report = await orchestrator.confirmImport(preview.jobId, 'local')
    expect(report.status).toBe('completed')
    expect(orchestrator.getJob(preview.jobId)?.status).toBe('completed')
  })

  it('emits extraction progress with a known total', async () => {
    const { orchestrator } = await createTestOrchestrator('preview-progress')
    const events: { stage: string; processed: number; total?: number }[] = []
    orchestrator.onProgress((event) => {
      events.push({ stage: event.stage, processed: event.processed, total: event.total })
    })

    await orchestrator.startPreview('demo', { source: 'demo://local' })

    const extraction = events.filter((e) => e.stage === 'extraction')
    expect(extraction.some((e) => e.total === 6)).toBe(true)
    const last = extraction.at(-1)
    expect(last?.processed).toBeGreaterThan(0)
    expect(last?.total).toBe(6)
  })
})
