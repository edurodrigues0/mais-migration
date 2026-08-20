export const UNIPLUS_SOURCE = 'uniplus'

export const UNIPLUS_DEFAULTS = {
  host: '127.0.0.1',
  port: '5432',
  database: '',
  user: 'postgres',
  password: '',
  ssl: 'false'
} as const

export function rowToRaw(row: Record<string, unknown>): Record<string, unknown> {
  const raw: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    raw[key.toLowerCase()] = value
  }
  return raw
}
