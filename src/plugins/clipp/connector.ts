import Firebird from 'node-firebird'
import type { ConnectionConfig } from '@domain/plugin/types'
import { CLIPP_DEFAULTS } from './types'

export interface ClippFirebirdOptions {
  host: string
  port: number
  database: string
  user: string
  password: string
  encoding?: string
}

type FirebirdDatabase = {
  query: (sql: string, params: unknown[], callback: (err: Error | null, result: unknown) => void) => void
  detach: (callback?: (err: Error | null) => void) => void
}

function resolveOptions(connection: ConnectionConfig): ClippFirebirdOptions {
  const database = connection.source?.trim()
  if (!database) {
    throw new Error('Informe o caminho absoluto do arquivo .fdb do Clipp')
  }

  const host = connection.options?.host?.trim() || CLIPP_DEFAULTS.host
  const port = Number(connection.options?.port || CLIPP_DEFAULTS.port)
  const user = connection.options?.user?.trim() || CLIPP_DEFAULTS.user
  const password = connection.options?.password ?? CLIPP_DEFAULTS.password

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error('Porta Firebird inválida')
  }

  return {
    host,
    port,
    database,
    user,
    password,
    encoding: connection.options?.encoding || 'UTF8'
  }
}

function attachAsync(options: ClippFirebirdOptions): Promise<FirebirdDatabase> {
  return new Promise((resolve, reject) => {
    Firebird.attach(options, (err: Error | null, db: FirebirdDatabase) => {
      if (err) reject(err)
      else resolve(db)
    })
  })
}

export class ClippConnector {
  private db: FirebirdDatabase | null = null
  private lastOptions: ClippFirebirdOptions | null = null

  async connect(connection: ConnectionConfig): Promise<void> {
    if (this.db) {
      await this.disconnect()
    }
    this.lastOptions = resolveOptions(connection)
    this.db = await attachAsync(this.lastOptions)
  }

  async disconnect(): Promise<void> {
    const current = this.db
    this.db = null
    if (!current) return
    await new Promise<void>((resolve) => {
      current.detach(() => resolve())
    })
  }

  getDatabase(): FirebirdDatabase {
    if (!this.db) {
      throw new Error('Clipp não conectado. Chame connect() antes.')
    }
    return this.db
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const db = this.getDatabase()
    return new Promise((resolve, reject) => {
      db.query(sql, params, (err, result) => {
        if (err) reject(err)
        else resolve((result as T[]) ?? [])
      })
    })
  }

  /**
   * Detecta se o banco parece Clipp (tabelas TB_CLIENTE e TB_ESTOQUE).
   * Pode ser chamado com conexão já aberta ou abre temporariamente.
   */
  async detect(connection: ConnectionConfig): Promise<boolean> {
    const alreadyConnected = Boolean(this.db)
    try {
      if (!alreadyConnected) {
        await this.connect(connection)
      }
      const rows = await this.query<{ CNT: number }>(
        `SELECT COUNT(*) AS CNT
         FROM RDB$RELATIONS
         WHERE TRIM(RDB$RELATION_NAME) IN ('TB_CLIENTE', 'TB_ESTOQUE')`
      )
      const count = Number(rows[0]?.CNT ?? 0)
      return count >= 2
    } catch {
      return false
    } finally {
      if (!alreadyConnected) {
        await this.disconnect()
      }
    }
  }
}
