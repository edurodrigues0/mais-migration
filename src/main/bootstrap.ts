import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { app } from 'electron'
import { createDatabase } from '@infrastructure/db/client'
import { MigrationRepository } from '@infrastructure/db/migration-repository'
import { StagingStore } from '@infrastructure/db/staging-store'
import { MaisGestaoPostgresImporter } from '@infrastructure/importer/mais-gestao-postgres-importer'
import { createLogger } from '@infrastructure/logging/logger'
import { createDefaultPluginRegistry } from '@application/plugins/plugin-registry'
import { MigrationOrchestrator } from '@application/migration/orchestrator'
import { APP_NAME } from '@config/index'
import {
  loadDestinoConfig,
  loadDestinoConfigFromFile,
  destinoLabel,
  findDestinoIniPath,
  iniPathForBase
} from '@config/destino-ini'

export interface AppServices {
  orchestrator: MigrationOrchestrator
  repository: MigrationRepository
  logger: ReturnType<typeof createLogger>
  importer: MaisGestaoPostgresImporter
}

function uniqueDirs(dirs: string[]): string[] {
  return [...new Set(dirs.filter(Boolean))]
}

function destinoSearchBases(): string[] {
  const cwd = process.cwd()
  const userData = app.getPath('userData')
  const appPath = app.getAppPath()
  const bases: string[] = []
  if (app.isPackaged) {
    bases.push(dirname(app.getPath('exe')))
  }
  bases.push(cwd, userData, appPath)
  return uniqueDirs(bases)
}

function exampleIniCandidates(): string[] {
  const exeDir = dirname(app.getPath('exe'))
  return uniqueDirs([
    join(exeDir, 'config', 'destino.ini.example'),
    join(process.resourcesPath, 'config', 'destino.ini.example'),
    join(process.cwd(), 'config', 'destino.ini.example')
  ])
}

function seedDestinoIniForSupport(): string {
  const example = exampleIniCandidates().find((path) => existsSync(path))
  const exeDir = dirname(app.getPath('exe'))
  const exeTarget = iniPathForBase(exeDir)
  const userDataTarget = iniPathForBase(app.getPath('userData'))
  const preferExeDir = app.isPackaged && existsSync(join(exeDir, 'config', 'destino.ini.example'))
  const targets = preferExeDir ? [exeTarget, userDataTarget] : [userDataTarget]

  for (const target of targets) {
    try {
      mkdirSync(dirname(target), { recursive: true })
      if (example && !existsSync(target)) {
        copyFileSync(example, target)
      }
      return target
    } catch {
      /* pasta do instalador pode ser somente leitura (Program Files) */
    }
  }

  return userDataTarget
}

function resolveDestinoIniForApp(): string {
  if (process.env.DESTINO_INI?.trim()) {
    const path = findDestinoIniPath(destinoSearchBases())
    if (path && existsSync(path)) return path
    throw new Error(`Arquivo DESTINO_INI não encontrado: ${process.env.DESTINO_INI}`)
  }

  const found = findDestinoIniPath(destinoSearchBases())
  if (found) return found

  const seeded = seedDestinoIniForSupport()
  throw new Error(
    `Configure o Postgres do Mais Gestão no arquivo:\n${seeded}\n\n` +
    'Preencha host, banco, usuário e senha e abra o aplicativo novamente.'
  )
}

export async function bootstrapServices(): Promise<AppServices> {
  const logger = createLogger(APP_NAME)
  const userData = app.getPath('userData')
  const dbPath = join(userData, 'data', 'mais-migration.db')
  const stagingDir = join(userData, 'data', 'staging')

  const destino = app.isPackaged
    ? loadDestinoConfigFromFile(resolveDestinoIniForApp())
    : loadDestinoConfig(destinoSearchBases()[0] ?? process.cwd())
  logger.info(
    { destination: destinoLabel(destino), iniPath: destino.iniPath },
    'Destino Postgres carregado'
  )

  const { db, persist, persistDebounced } = await createDatabase(dbPath)
  const stagingStore = new StagingStore(stagingDir)
  const repository = new MigrationRepository(db, persist, stagingStore, persistDebounced)

  const importer = new MaisGestaoPostgresImporter(destino, logger)
  await importer.ping()

  const registry = createDefaultPluginRegistry()
  const orchestrator = new MigrationOrchestrator(registry, repository, importer, logger)

  logger.info({ dbPath, stagingDir, destination: destinoLabel(destino) }, 'Services bootstrapped')
  return { orchestrator, repository, logger, importer }
}
