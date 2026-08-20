import { describe, expect, it } from 'vitest'
import { progressPercent } from '@shared/progress'
import type { MigrationProgressEvent } from '@shared/ipc'

function event(partial: Partial<MigrationProgressEvent>): MigrationProgressEvent {
  return {
    jobId: 'job-1',
    stage: 'extraction',
    message: 'Lendo',
    processed: 0,
    ...partial
  }
}

describe('progressPercent', () => {
  it('returns percent capped at 100 when total is known', () => {
    expect(progressPercent(event({ processed: 25, total: 100 }))).toBe(25)
    expect(progressPercent(event({ processed: 3, total: 6 }))).toBe(50)
    expect(progressPercent(event({ processed: 120, total: 100 }))).toBe(100)
  })

  it('returns null when total is missing or zero', () => {
    expect(progressPercent(undefined)).toBeNull()
    expect(progressPercent(event({ processed: 10 }))).toBeNull()
    expect(progressPercent(event({ processed: 10, total: 0 }))).toBeNull()
  })
})
