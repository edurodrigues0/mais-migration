import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const migrationJobs = sqliteTable('migration_jobs', {
  id: text('id').primaryKey(),
  pluginId: text('plugin_id').notNull(),
  status: text('status').notNull(),
  connectionJson: text('connection_json').notNull(),
  stagesJson: text('stages_json').notNull(),
  countersJson: text('counters_json').notNull(),
  error: text('error'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const migrationReports = sqliteTable('migration_reports', {
  id: text('id').primaryKey(),
  jobId: text('job_id')
    .notNull()
    .references(() => migrationJobs.id),
  pluginId: text('plugin_id').notNull(),
  status: text('status').notNull(),
  countersJson: text('counters_json').notNull(),
  durationMs: integer('duration_ms').notNull(),
  summary: text('summary').notNull(),
  errorsJson: text('errors_json').notNull(),
  createdAt: text('created_at').notNull()
})

export const canonicalStaging = sqliteTable('canonical_staging', {
  id: text('id').primaryKey(),
  jobId: text('job_id')
    .notNull()
    .references(() => migrationJobs.id),
  kind: text('kind').notNull(),
  externalId: text('external_id').notNull(),
  sourceSystem: text('source_system').notNull(),
  payloadJson: text('payload_json').notNull(),
  warningsJson: text('warnings_json').notNull(),
  imported: integer('imported', { mode: 'boolean' }).notNull().default(false)
})

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull()
})
