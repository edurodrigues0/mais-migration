import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import { drizzle } from 'drizzle-orm/sql-js'
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'fs'
import { createRequire } from 'module'
import { dirname, join, sep } from 'path'
import * as schema from '@database/schema'

const require = createRequire(import.meta.url)

/** Acima disso, o WASM do sql.js costuma falhar ao alocar ArrayBuffer. */
const MAX_LOADABLE_DB_BYTES = 32 * 1024 * 1024

export type AppDatabase = ReturnType<typeof drizzle<typeof schema>>

export interface DatabaseBundle {
  db: AppDatabase
  sqlite: Database
  /** Persist imediato (fim de operação crítica). */
  persist: () => void
  /** Persist adiado — evita export() a cada saveJob no preview. */
  persistDebounced: (ms?: number) => void
  dbPath: string
}

let sqlJsPromise: Promise<SqlJsStatic> | null = null

function resolveSqlWasmPath(): string {
  const fromModule = join(dirname(require.resolve('sql.js')), 'sql-wasm.wasm')
  const unpacked = fromModule.replace(`${sep}app.asar${sep}`, `${sep}app.asar.unpacked${sep}`)
  for (const candidate of [fromModule, unpacked]) {
    if (existsSync(candidate)) return candidate
  }
  return fromModule
}

function loadSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    const wasmPath = resolveSqlWasmPath()
    sqlJsPromise = initSqlJs({
      locateFile: () => wasmPath
    })
  }
  return sqlJsPromise
}

const BOOTSTRAP_SQL = `
  CREATE TABLE IF NOT EXISTS migration_jobs (
    id TEXT PRIMARY KEY,
    plugin_id TEXT NOT NULL,
    status TEXT NOT NULL,
    connection_json TEXT NOT NULL,
    stages_json TEXT NOT NULL,
    counters_json TEXT NOT NULL,
    error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS migration_reports (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES migration_jobs(id),
    plugin_id TEXT NOT NULL,
    status TEXT NOT NULL,
    counters_json TEXT NOT NULL,
    duration_ms INTEGER NOT NULL,
    summary TEXT NOT NULL,
    errors_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS canonical_staging (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES migration_jobs(id),
    kind TEXT NOT NULL,
    external_id TEXT NOT NULL,
    source_system TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    warnings_json TEXT NOT NULL,
    imported INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS imported_entities (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    external_id TEXT NOT NULL,
    source_system TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    imported_at TEXT NOT NULL
  );
`

function quarantineDbFile(dbPath: string, _reason: string): void {
  const bak = `${dbPath}.broken-${Date.now()}`
  try {
    renameSync(dbPath, bak)
  } catch {
    try {
      writeFileSync(dbPath, Buffer.alloc(0))
    } catch {
      /* ignore */
    }
  }
}

/**
 * Staging canônico migrou para JSONL no disco.
 * Limpa tabelas legadas e faz VACUUM para o export() não alocar GB.
 */
function purgeLegacyHeavyTables(sqlite: Database): void {
  try {
    sqlite.run('DELETE FROM canonical_staging')
    sqlite.run('DELETE FROM imported_entities')
    sqlite.run('VACUUM')
  } catch {
    // tabelas podem não existir em DBs antigos incompletos
  }
}

export async function createDatabase(dbPath: string): Promise<DatabaseBundle> {
  mkdirSync(dirname(dbPath), { recursive: true })
  const SQL = await loadSqlJs()

  let sqlite: Database

  if (existsSync(dbPath)) {
    const size = statSync(dbPath).size
    if (size > MAX_LOADABLE_DB_BYTES) {
      quarantineDbFile(dbPath, `${(size / 1024 / 1024).toFixed(0)}MB > limite sql.js`)
      sqlite = new SQL.Database()
    } else {
      try {
        sqlite = new SQL.Database(readFileSync(dbPath))
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (/Array buffer|allocation|out of memory|memory/i.test(message)) {
          quarantineDbFile(dbPath, message)
          sqlite = new SQL.Database()
        } else {
          throw error
        }
      }
    }
  } else {
    sqlite = new SQL.Database()
  }

  sqlite.run(BOOTSTRAP_SQL)
  purgeLegacyHeavyTables(sqlite)

  let persistQueued = false
  let persistTimer: ReturnType<typeof setTimeout> | null = null

  const persistNow = () => {
    persistQueued = false
    if (persistTimer) {
      clearTimeout(persistTimer)
      persistTimer = null
    }
    const data = sqlite.export()
    writeFileSync(dbPath, Buffer.from(data))
  }

  const persist = () => {
    if (persistTimer) {
      clearTimeout(persistTimer)
      persistTimer = null
    }
    persistNow()
  }

  const persistDebounced = (ms = 2500) => {
    persistQueued = true
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(() => {
      if (persistQueued) persistNow()
    }, ms)
  }

  persist()

  const db = drizzle(sqlite, { schema })
  return { db, sqlite, persist, persistDebounced, dbPath }
}
