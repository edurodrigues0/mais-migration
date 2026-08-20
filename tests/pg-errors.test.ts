import { describe, expect, it } from 'vitest'
import { isConnectionError, wrapConnectionError } from '@infrastructure/db/pg-errors'

describe('pg connection errors', () => {
  it('detects terminated and not queryable clients', () => {
    expect(isConnectionError(new Error('Connection terminated unexpectedly'))).toBe(true)
    expect(isConnectionError(new Error('Client has encountered a connection error and is not queryable'))).toBe(
      true
    )
    expect(isConnectionError(new Error('value too long for type character varying(44)'))).toBe(false)
  })

  it('wraps disconnects with a retry-friendly message', () => {
    const wrapped = wrapConnectionError(new Error('Connection terminated unexpectedly'))
    expect(wrapped.message).toMatch(/Conexão com o Postgres/)
  })
})
