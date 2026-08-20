/** Falhas de conexão Postgres que não devem derrubar o processo Electron. */
const CONNECTION_ERROR_RE =
  /connection terminated|not queryable|Client has encountered a connection error|Connection terminated unexpectedly|ECONNRESET|ECONNREFUSED|ENOTFOUND|EPIPE|ETIMEDOUT|server closed the connection|SSL connection has been closed|timeout expired|Connection ended unexpectedly/i

const CONNECTION_SQLSTATES = new Set([
  '08000',
  '08003',
  '08006',
  '08001',
  '57P01',
  '57P02',
  '57P03'
])

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function isConnectionError(error: unknown): boolean {
  const message = errorMessage(error)
  if (CONNECTION_ERROR_RE.test(message)) return true
  const code = (error as { code?: string }).code
  if (code && CONNECTION_SQLSTATES.has(code)) return true
  const cause = (error as { cause?: unknown }).cause
  if (cause && cause !== error) return isConnectionError(cause)
  return false
}

export function wrapConnectionError(error: unknown): Error {
  const message = errorMessage(error)
  if (isConnectionError(error)) {
    return new Error(
      `Conexão com o Postgres do destino foi interrompida (${message}). Confirme a importação de novo; o UPSERT continua de onde parou.`
    )
  }
  return error instanceof Error ? error : new Error(message)
}
