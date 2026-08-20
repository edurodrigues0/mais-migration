import { describe, expect, it } from 'vitest'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { StagingStore, batchAsync } from '@infrastructure/db/staging-store'
import type { CanonicalEntity } from '@domain/canonical/types'

function makeEntity(id: string): CanonicalEntity {
  return {
    externalId: id,
    sourceSystem: 'test',
    kind: 'produto',
    payload: { codigo: id, descricao: `P${id}` },
    warnings: []
  }
}

describe('StagingStore', () => {
  it('writes and iterates JSONL without loading all at once', async () => {
    const dir = join(tmpdir(), 'mais-migration-staging', String(Date.now()))
    mkdirSync(dir, { recursive: true })
    const store = new StagingStore(dir)
    const jobId = 'job-1'

    const writer = store.createWriter(jobId)
    await writer.append(makeEntity('1'))
    await writer.append(makeEntity('2'))
    await writer.append(makeEntity('3'))
    await writer.close()

    expect(store.exists(jobId)).toBe(true)
    expect(writer.count).toBe(3)

    const ids: string[] = []
    for await (const entity of store.iterate(jobId)) {
      ids.push(entity.externalId)
    }
    expect(ids).toEqual(['1', '2', '3'])

    const batches: string[][] = []
    for await (const batch of batchAsync(store.iterate(jobId), 2)) {
      batches.push(batch.map((e) => e.externalId))
    }
    expect(batches).toEqual([['1', '2'], ['3']])

    store.clear(jobId)
    expect(store.exists(jobId)).toBe(false)
  })

  it('iterateOfKind yields only matching entities', async () => {
    const dir = join(tmpdir(), 'mais-migration-staging', `kind-${Date.now()}`)
    mkdirSync(dir, { recursive: true })
    const store = new StagingStore(dir)
    const writer = store.createWriter('job-k')
    await writer.append(makeEntity('p1'))
    await writer.append({
      ...makeEntity('nf1'),
      kind: 'nota_fiscal',
      payload: { numeronotafiscal: '1' }
    })
    await writer.append(makeEntity('p2'))
    await writer.close()

    const ids: string[] = []
    for await (const entity of store.iterateOfKind('job-k', 'nota_fiscal')) {
      ids.push(entity.externalId)
    }
    expect(ids).toEqual(['nf1'])
  })

  it('writeAll is readable via listAll', () => {
    const dir = join(tmpdir(), 'mais-migration-staging', `all-${Date.now()}`)
    mkdirSync(dir, { recursive: true })
    const store = new StagingStore(dir)
    store.writeAll('j2', [makeEntity('a'), makeEntity('b')])
    expect(store.listAll('j2').map((e) => e.externalId)).toEqual(['a', 'b'])
  })
})
