import type { CanonicalEntity, EntityKind, SourceEntity } from '@domain/canonical/types'

export interface PluginMetadata {
  id: string
  name: string
  version: string
  description: string
  supportedEntities: EntityKind[]
}

export interface ConnectionConfig {
  /** Identificador livre (arquivo, DSN, host, etc.) — interpretado pelo plugin */
  source: string
  options?: Record<string, string>
}

export interface ExtractContext {
  connection: ConnectionConfig
  entities?: EntityKind[]
}

export interface ValidationIssue {
  field?: string
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
}

export interface ErpPlugin {
  metadata(): PluginMetadata
  detect(connection: ConnectionConfig): Promise<boolean>
  connect(connection: ConnectionConfig): Promise<void>
  disconnect?(): Promise<void>
  extract(context: ExtractContext): AsyncGenerator<SourceEntity>
  /** Total de registros a extrair, quando o plugin consegue contar antes da leitura. */
  countExtractable?(connection: ConnectionConfig): Promise<number>
  validate(entity: SourceEntity): ValidationResult
  transform(entity: SourceEntity): CanonicalEntity
}
