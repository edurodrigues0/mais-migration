import { mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createDatabase } from '@infrastructure/db/client'
import { MigrationRepository } from '@infrastructure/db/migration-repository'
import { StagingStore } from '@infrastructure/db/staging-store'
import { CanonicalImporter } from '@infrastructure/importer/canonical-importer'
import { createLogger } from '@infrastructure/logging/logger'
import { createDefaultPluginRegistry } from '@application/plugins/plugin-registry'
import { MigrationOrchestrator } from '@application/migration/orchestrator'

export async function createTestOrchestrator(suffix = String(Date.now())) {
  const dir = join(tmpdir(), 'mais-migration-tests', suffix)
  mkdirSync(dir, { recursive: true })
  const dbPath = join(dir, 'test.db')
  const stagingDir = join(dir, 'staging')
  const { db, sqlite, persist, persistDebounced } = await createDatabase(dbPath)
  const logger = createLogger('test')
  logger.level = 'silent'
  const stagingStore = new StagingStore(stagingDir)
  const repository = new MigrationRepository(db, persist, stagingStore, persistDebounced)
  const importer = new CanonicalImporter(sqlite, logger, persist)
  const registry = createDefaultPluginRegistry()
  const orchestrator = new MigrationOrchestrator(registry, repository, importer, logger)
  return { orchestrator, repository, sqlite, dbPath, stagingDir }
}
