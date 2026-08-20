import { existsSync, readFileSync } from 'fs'
import { isAbsolute, join } from 'path'

export interface DestinoDatabaseConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl: boolean
}

export interface DestinoMigrationConfig {
  /** Opcional: preferência; a seleção real é feita no frontend */
  idempresa?: string
}

export interface DestinoConfig {
  database: DestinoDatabaseConfig
  migration: DestinoMigrationConfig
  iniPath: string
}

function parseIni(content: string): Record<string, Record<string, string>> {
  const sections: Record<string, Record<string, string>> = {}
  let current = 'default'

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith(';') || line.startsWith('#')) continue

    const sectionMatch = line.match(/^\[([^\]]+)\]$/)
    if (sectionMatch) {
      current = sectionMatch[1].trim().toLowerCase()
      sections[current] ??= {}
      continue
    }

    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim().toLowerCase()
    const value = line.slice(eq + 1).trim()
    sections[current] ??= {}
    sections[current][key] = value
  }

  return sections
}

function requireValue(section: Record<string, string> | undefined, key: string, label: string): string {
  const value = section?.[key]?.trim()
  if (!value) {
    throw new Error(`Config destino.ini inválida: faltando ${label}`)
  }
  return value
}

export function iniPathForBase(baseDir: string): string {
  return join(baseDir, 'config', 'destino.ini')
}

export function resolveDestinoIniPath(cwd = process.cwd()): string {
  if (process.env.DESTINO_INI?.trim()) {
    const envPath = process.env.DESTINO_INI.trim()
    return isAbsolute(envPath) ? envPath : join(cwd, envPath)
  }
  return iniPathForBase(cwd)
}

/** Primeiro `config/destino.ini` existente. `DESTINO_INI` tem prioridade absoluta. */
export function findDestinoIniPath(candidateBases: string[], cwd = process.cwd()): string | undefined {
  if (process.env.DESTINO_INI?.trim()) {
    return resolveDestinoIniPath(cwd)
  }
  for (const base of candidateBases) {
    const path = iniPathForBase(base)
    if (existsSync(path)) return path
  }
  return undefined
}

export function loadDestinoConfigFromFile(iniPath: string): DestinoConfig {
  if (!existsSync(iniPath)) {
    throw new Error(
      `Arquivo de destino não encontrado: ${iniPath}. Copie destino.ini.example para destino.ini na mesma pasta e preencha a conexão do Postgres.`
    )
  }

  const sections = parseIni(readFileSync(iniPath, 'utf8'))
  const database = sections.database ?? {}
  const migration = sections.migration ?? {}

  const portRaw = database.port?.trim() || '5432'
  const port = Number(portRaw)
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error('Config destino.ini inválida: port deve ser um número positivo')
  }

  const sslRaw = (database.ssl ?? 'false').trim().toLowerCase()
  const ssl = sslRaw === 'true' || sslRaw === '1' || sslRaw === 'yes'

  const idempresa = migration.idempresa?.trim() || undefined

  return {
    iniPath,
    database: {
      host: requireValue(database, 'host', '[database].host'),
      port,
      database: requireValue(database, 'database', '[database].database'),
      user: requireValue(database, 'user', '[database].user'),
      password: database.password ?? '',
      ssl
    },
    migration: {
      idempresa
    }
  }
}

export function loadDestinoConfig(cwd = process.cwd()): DestinoConfig {
  return loadDestinoConfigFromFile(resolveDestinoIniPath(cwd))
}

export function destinoLabel(config: DestinoConfig): string {
  return `${config.database.database}@${config.database.host}:${config.database.port}`
}

/** Exposto para testes unitários do parser */
export function parseIniForTests(content: string) {
  return parseIni(content)
}
