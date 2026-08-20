import { describe, expect, it } from 'vitest'
import { destinoLabel, parseIniForTests, loadDestinoConfig, findDestinoIniPath, loadDestinoConfigFromFile } from '@config/destino-ini'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('destino.ini loader', () => {
  it('parses sections and keys', () => {
    const sections = parseIniForTests(`
[database]
host=db.local
port=5433
database=mais
user=app
password=secret
ssl=true

[migration]
idempresa=emp-1
`)
    expect(sections.database.host).toBe('db.local')
    expect(sections.database.ssl).toBe('true')
    expect(sections.migration.idempresa).toBe('emp-1')
  })

  it('loads database config without requiring idempresa', () => {
    const dir = join(tmpdir(), `mais-ini-${Date.now()}`)
    mkdirSync(join(dir, 'config'), { recursive: true })
    writeFileSync(
      join(dir, 'config', 'destino.ini'),
      `[database]
host=127.0.0.1
port=5432
database=mais_gestao
user=postgres
password=x
ssl=false
`
    )

    const config = loadDestinoConfig(dir)
    expect(config.database.host).toBe('127.0.0.1')
    expect(config.migration.idempresa).toBeUndefined()
    expect(destinoLabel(config)).toBe('mais_gestao@127.0.0.1:5432')

    rmSync(dir, { recursive: true, force: true })
  })

  it('accepts optional idempresa as suggestion', () => {
    const dir = join(tmpdir(), `mais-ini-sug-${Date.now()}`)
    mkdirSync(join(dir, 'config'), { recursive: true })
    writeFileSync(
      join(dir, 'config', 'destino.ini'),
      `[database]
host=127.0.0.1
port=5432
database=mais_gestao
user=postgres
password=

[migration]
idempresa=abc-123
`
    )
    const config = loadDestinoConfig(dir)
    expect(config.migration.idempresa).toBe('abc-123')
    rmSync(dir, { recursive: true, force: true })
  })

  it('finds destino.ini in the first candidate base', () => {
    const dir = join(tmpdir(), `mais-ini-find-${Date.now()}`)
    mkdirSync(join(dir, 'config'), { recursive: true })
    writeFileSync(
      join(dir, 'config', 'destino.ini'),
      `[database]
host=10.0.0.2
port=5432
database=mais_gestao
user=postgres
password=x
`
    )
    const path = findDestinoIniPath([join(tmpdir(), 'missing'), dir])
    expect(path).toBe(join(dir, 'config', 'destino.ini'))
    expect(loadDestinoConfigFromFile(path!).database.host).toBe('10.0.0.2')
    rmSync(dir, { recursive: true, force: true })
  })
})
