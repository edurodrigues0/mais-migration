import { describe, expect, it } from 'vitest'
import { createDemoPlugin } from '@plugins/demo'

describe('demo plugin', () => {
  it('exposes metadata from manifest', () => {
    const plugin = createDemoPlugin()
    const meta = plugin.metadata()
    expect(meta.id).toBe('demo')
    expect(meta.supportedEntities).toContain('cliente')
  })

  it('detects demo connection sources', async () => {
    const plugin = createDemoPlugin()
    await expect(plugin.detect({ source: 'demo://local' })).resolves.toBe(true)
    await expect(plugin.detect({ source: 'other://x' })).resolves.toBe(false)
  })

  it('extracts, validates and transforms fixtures', async () => {
    const plugin = createDemoPlugin()
    await plugin.connect({ source: 'demo://local' })

    const entities = []
    for await (const entity of plugin.extract({ connection: { source: 'demo://local' } })) {
      const validation = plugin.validate(entity)
      expect(validation.valid).toBe(true)
      const canonical = plugin.transform(entity)
      expect(canonical.sourceSystem).toBe('demo')
      expect(canonical.externalId).toBeTruthy()
      entities.push(canonical)
    }

    expect(entities.length).toBeGreaterThanOrEqual(5)
    await plugin.disconnect?.()
  })
})
