import pg from 'pg'
import type { ConnectionConfig } from '@domain/plugin/types'
import { UNIPLUS_DEFAULTS } from './types'

const { Pool } = pg

export interface UniplusPgOptions {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl: boolean
}

function resolveOptions(connection: ConnectionConfig): UniplusPgOptions {
  const host = connection.options?.host?.trim() || UNIPLUS_DEFAULTS.host
  const port = Number(connection.options?.port || UNIPLUS_DEFAULTS.port)
  const database =
    connection.options?.database?.trim() ||
    connection.source?.replace(/^postgres:\/\//i, '').split('/').pop()?.trim() ||
    ''
  const user = connection.options?.user?.trim() || UNIPLUS_DEFAULTS.user
  const password = connection.options?.password ?? UNIPLUS_DEFAULTS.password
  const sslRaw = (connection.options?.ssl || UNIPLUS_DEFAULTS.ssl).toLowerCase()
  const ssl = sslRaw === 'true' || sslRaw === '1' || sslRaw === 'yes'

  if (!database) {
    throw new Error('Informe o nome do banco Postgres do UniPlus')
  }
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error('Porta Postgres inválida')
  }

  return { host, port, database, user, password, ssl }
}

export class UniplusConnector {
  private pool: pg.Pool | null = null

  async connect(connection: ConnectionConfig): Promise<void> {
    await this.disconnect()
    const opts = resolveOptions(connection)
    this.pool = new Pool({
      host: opts.host,
      port: opts.port,
      database: opts.database,
      user: opts.user,
      password: opts.password,
      ssl: opts.ssl ? { rejectUnauthorized: false } : undefined,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 20_000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 5_000
    })
    this.pool.on('error', () => {
      /* evita Uncaught Exception no main process do Electron */
    })
    const client = await this.pool.connect()
    try {
      await client.query('SELECT 1')
    } finally {
      client.release()
    }
  }

  async disconnect(): Promise<void> {
    if (!this.pool) return
    await this.pool.end()
    this.pool = null
  }

  getPool(): pg.Pool {
    if (!this.pool) {
      throw new Error('UniPlus não conectado. Chame connect() antes.')
    }
    return this.pool
  }

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params: unknown[] = []
  ): Promise<T[]> {
    const result = await this.getPool().query(sql, params)
    return result.rows as T[]
  }

  async detect(connection: ConnectionConfig): Promise<boolean> {
    const alreadyConnected = Boolean(this.pool)
    try {
      if (!alreadyConnected) {
        await this.connect(connection)
      }
      const rows = await this.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = 'entidade'
         ) AS exists`
      )
      return Boolean(rows[0]?.exists)
    } catch {
      return false
    } finally {
      if (!alreadyConnected) {
        await this.disconnect()
      }
    }
  }
}
