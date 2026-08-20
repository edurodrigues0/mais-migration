import type { CanonicalEntity, SourceEntity } from '@domain/canonical/types'
import type {
  ConnectionConfig,
  ErpPlugin,
  ExtractContext,
  PluginMetadata,
  ValidationResult
} from '@domain/plugin/types'
import manifest from './manifest.json'
import { UniplusConnector } from './connector'
import { countUniplusExtractable, extractUniplusEntities } from './extractor'
import { mapUniplusEntity } from './mapper'
import { validateUniplusEntity } from './validator'

export function createUniplusPlugin(): ErpPlugin {
  const connector = new UniplusConnector()

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
      yield* extractUniplusEntities(connector)
    },

    async countExtractable(_connection: ConnectionConfig): Promise<number> {
      return countUniplusExtractable(connector)
    },

    validate(entity: SourceEntity): ValidationResult {
      return validateUniplusEntity(entity)
    },

    transform(entity: SourceEntity): CanonicalEntity {
      return mapUniplusEntity(entity)
    }
  }
}
