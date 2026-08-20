import type { CanonicalEntity, SourceEntity } from '@domain/canonical/types'
import type {
  ConnectionConfig,
  ErpPlugin,
  ExtractContext,
  PluginMetadata,
  ValidationResult
} from '@domain/plugin/types'
import manifest from './manifest.json'
import { ClippConnector } from './connector'
import { countClippExtractable, extractClippEntities } from './extractor'
import { mapClippEntity } from './mapper'
import { validateClippEntity } from './validator'

export function createClippPlugin(): ErpPlugin {
  const connector = new ClippConnector()

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
      yield* extractClippEntities(connector)
    },

    async countExtractable(_connection: ConnectionConfig): Promise<number> {
      return countClippExtractable(connector)
    },

    validate(entity: SourceEntity): ValidationResult {
      return validateClippEntity(entity)
    },

    transform(entity: SourceEntity): CanonicalEntity {
      return mapClippEntity(entity)
    }
  }
}
