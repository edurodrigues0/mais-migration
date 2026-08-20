import pino from 'pino'

export function createLogger(name = 'mais-migration') {
  return pino({
    name,
    level: process.env.LOG_LEVEL ?? 'info',
    redact: {
      paths: [
        'connection.password',
        'connection.options.password',
        'password',
        'token',
        'database.password',
        'destino.database.password'
      ],
      censor: '[REDACTED]'
    }
  })
}

export type Logger = ReturnType<typeof createLogger>
