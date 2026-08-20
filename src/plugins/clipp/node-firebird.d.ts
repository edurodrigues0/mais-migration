declare module 'node-firebird' {
  type AttachCallback = (err: Error | null, db: Database) => void

  interface Options {
    host?: string
    port?: number
    database?: string
    user?: string
    password?: string
    encoding?: string
    lowercase_keys?: boolean
    role?: string | null
    pageSize?: number
  }

  interface Database {
    query: (
      sql: string,
      params: unknown[] | ((err: Error | null, result: unknown) => void),
      callback?: (err: Error | null, result: unknown) => void
    ) => void
    detach: (callback?: (err: Error | null) => void) => void
  }

  interface FirebirdStatic {
    attach: (options: Options, callback: AttachCallback) => void
  }

  const Firebird: FirebirdStatic
  export default Firebird
}
