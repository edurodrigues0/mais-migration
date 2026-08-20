import type { CanonicalEntity, SourceEntity } from '@domain/canonical/types'
import type {
  ConnectionConfig,
  ErpPlugin,
  ExtractContext,
  PluginMetadata,
  ValidationResult
} from '@domain/plugin/types'
import manifest from './manifest.json'
import { DemoConnector } from './connector'
import { countDemoExtractable, extractDemoEntities } from './extractor'
import { mapDemoEntity } from './mapper'
import { validateDemoEntity } from './validator'

export function createDemoPlugin(): ErpPlugin {
  const connector = new DemoConnector()

  return {
    metadata(): PluginMetadata {
      return {
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        supportedEntities: manifest.supportedEntities as PluginMetadata['supportedEntities']
      }
    },

    async detect(connection: ConnectionConfig): Promise<boolean> {
      return connector.detect(connection)
    },

    async connect(connection: ConnectionConfig): Promise<void> {
      await connector.connect(connection)
    },

    async disconnect(): Promise<void> {
      await connector.disconnect()
    },

    async *extract(_context: ExtractContext): AsyncGenerator<SourceEntity> {
      yield* extractDemoEntities()
    },

    async countExtractable(_connection: ConnectionConfig): Promise<number> {
      return countDemoExtractable()
    },

    validate(entity: SourceEntity): ValidationResult {
      return validateDemoEntity(entity)
    },

    transform(entity: SourceEntity): CanonicalEntity {
      return mapDemoEntity(entity)
    }
  }
}
