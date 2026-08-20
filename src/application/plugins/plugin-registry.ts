import type { ErpPlugin, PluginMetadata } from '@domain/plugin/types'
import { PluginNotFoundError } from '@domain/errors'
import { createDemoPlugin } from '@plugins/demo'
import { createClippPlugin } from '@plugins/clipp'
import { createUniplusPlugin } from '@plugins/uniplus'

export type PluginFactory = () => ErpPlugin

/**
 * Registry de plugins. O core registra factories — nunca detalhes internos.
 * Novos ERPs: adicionar factory aqui (ou descoberta dinâmica futura).
 */
export class PluginRegistry {
  private readonly factories = new Map<string, PluginFactory>()

  register(factory: PluginFactory): void {
    const plugin = factory()
    const id = plugin.metadata().id
    this.factories.set(id, factory)
  }

  listMetadata(): PluginMetadata[] {
    return [...this.factories.values()].map((factory) => factory().metadata())
  }

  get(pluginId: string): ErpPlugin {
    const factory = this.factories.get(pluginId)
    if (!factory) {
      throw new PluginNotFoundError(pluginId)
    }
    return factory()
  }
}

export function createDefaultPluginRegistry(): PluginRegistry {
  const registry = new PluginRegistry()
  registry.register(createDemoPlugin)
  registry.register(createClippPlugin)
  registry.register(createUniplusPlugin)
  return registry
}
