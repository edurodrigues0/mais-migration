import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
  createReadStream,
  type WriteStream
} from 'fs'
import { createInterface } from 'readline'
import { join } from 'path'
import type { CanonicalEntity } from '@domain/canonical/types'

/** Quantas linhas acumular antes de flush no disco (memória limitada). */
const WRITE_BUFFER_LINES = 64

export interface StagingWriter {
  /** Append com buffer + backpressure. */
  append(entity: CanonicalEntity): Promise<void>
  close(): Promise<void>
  readonly count: number
}

function serializeEntity(entity: CanonicalEntity): string {
  return JSON.stringify({
    externalId: entity.externalId,
    sourceSystem: entity.sourceSystem,
    kind: entity.kind,
    payload: entity.payload,
    warnings: entity.warnings.slice(0, 5)
  })
}

function writeWithBackpressure(stream: WriteStream, chunk: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ok = stream.write(chunk)
    if (ok) {
      resolve()
      return
    }
    const onDrain = () => {
      stream.off('error', onError)
      resolve()
    }
    const onError = (err: Error) => {
      stream.off('drain', onDrain)
      reject(err)
    }
    stream.once('drain', onDrain)
    stream.once('error', onError)
  })
}

/**
 * Staging canônico em NDJSON no disco (1 entidade por linha).
 * Evita estouro do sql.js (WASM em RAM) em migrações grandes.
 */
export class StagingStore {
  constructor(private readonly stagingDir: string) {
    mkdirSync(stagingDir, { recursive: true })
  }

  filePath(jobId: string): string {
    return join(this.stagingDir, `${jobId}.jsonl`)
  }

  exists(jobId: string): boolean {
    return existsSync(this.filePath(jobId))
  }

  clear(jobId: string): void {
    const path = this.filePath(jobId)
    if (existsSync(path)) {
      unlinkSync(path)
    }
  }

  /** Gravação síncrona completa (jobs pequenos / compat). */
  writeAll(jobId: string, entities: CanonicalEntity[]): void {
    const path = this.filePath(jobId)
    const body = entities.map(serializeEntity).join('\n')
    writeFileSync(path, body ? `${body}\n` : '', 'utf8')
  }

  createWriter(jobId: string): StagingWriter {
    this.clear(jobId)
    const path = this.filePath(jobId)
    const stream = createWriteStream(path, {
      encoding: 'utf8',
      flags: 'a',
      highWaterMark: 512 * 1024
    })
    let count = 0
    let closed = false
    const pending: string[] = []

    const flushBuffer = async () => {
      if (pending.length === 0) return
      const chunk = pending.join('')
      pending.length = 0
      await writeWithBackpressure(stream, chunk)
    }

    return {
      get count() {
        return count
      },
      async append(entity: CanonicalEntity) {
        if (closed) {
          throw new Error(`Staging writer já fechado: ${jobId}`)
        }
        pending.push(`${serializeEntity(entity)}\n`)
        count += 1
        if (pending.length >= WRITE_BUFFER_LINES) {
          await flushBuffer()
        }
      },
      async close() {
        if (closed) return
        closed = true
        await flushBuffer()
        await new Promise<void>((resolve, reject) => {
          stream.once('finish', () => resolve())
          stream.once('error', reject)
          stream.end()
        })
      }
    }
  }

  /** Itera só um kind, sem carregar o JSONL inteiro. */
  async *iterateOfKind(jobId: string, kind: string): AsyncGenerator<CanonicalEntity> {
    for await (const entity of this.iterate(jobId)) {
      if (entity.kind === kind) yield entity
    }
  }

  /** Itera linha a linha sem carregar o arquivo inteiro na RAM. */
  async *iterate(jobId: string): AsyncGenerator<CanonicalEntity> {
    const path = this.filePath(jobId)
    if (!existsSync(path)) return

    const rl = createInterface({
      input: createReadStream(path, { encoding: 'utf8', highWaterMark: 256 * 1024 }),
      crlfDelay: Infinity
    })

    for await (const line of rl) {
      const trimmed = line.trim()
      if (!trimmed) continue
      yield JSON.parse(trimmed) as CanonicalEntity
    }
  }

  /** Lê tudo (apenas para jobs pequenos / testes). Preferir iterate. */
  listAll(jobId: string): CanonicalEntity[] {
    const path = this.filePath(jobId)
    if (!existsSync(path)) return []
    const text = readFileSync(path, 'utf8')
    const entities: CanonicalEntity[] = []
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed) continue
      entities.push(JSON.parse(trimmed) as CanonicalEntity)
    }
    return entities
  }
}

/** Agrupa o generator em lotes de tamanho fixo. */
export async function* batchAsync<T>(
  source: AsyncIterable<T>,
  size: number
): AsyncGenerator<T[]> {
  let batch: T[] = []
  for await (const item of source) {
    batch.push(item)
    if (batch.length >= size) {
      yield batch
      batch = []
    }
  }
  if (batch.length > 0) yield batch
}
