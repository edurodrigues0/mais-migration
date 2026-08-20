import type { CanonicalEntity, EntityKind } from '@domain/canonical/types'
import type { ConnectionConfig } from '@domain/plugin/types'

export const MigrationStages = [
  'discovery',
  'connection',
  'detection',
  'extraction',
  'mapping',
  'validation',
  'auto_fix',
  'preview',
  'import',
  'final_validation',
  'report',
  'history'
] as const

export type MigrationStage = (typeof MigrationStages)[number]

export type JobStatus =
  | 'pending'
  | 'running'
  | 'preview_ready'
  | 'importing'
  | 'completed'
  | 'failed'
  | 'rolled_back'

export interface StageProgress {
  stage: MigrationStage
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  message?: string
  startedAt?: string
  finishedAt?: string
}

export interface EntityCounters {
  kind: EntityKind
  total: number
  valid: number
  warnings: number
  errors: number
  imported: number
}

export interface MigrationJob {
  id: string
  pluginId: string
  status: JobStatus
  connection: ConnectionConfig
  stages: StageProgress[]
  counters: EntityCounters[]
  error?: string
  createdAt: string
  updatedAt: string
}

export interface MigrationPreview {
  jobId: string
  counters: EntityCounters[]
  sample: CanonicalEntity[]
  warnings: string[]
}

export interface MigrationReport {
  jobId: string
  pluginId: string
  status: JobStatus
  counters: EntityCounters[]
  durationMs: number
  summary: string
  errors: string[]
  createdAt: string
}
