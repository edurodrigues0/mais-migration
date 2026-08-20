import type { CanonicalEntity } from '@domain/canonical/types'
import type { DestinoEmpresa } from '@shared/ipc'

export type { DestinoEmpresa }

export interface ImportResult {
  imported: number
  byKind: Record<string, number>
  warnings?: string[]
  destination?: string
}

export interface RollbackResult {
  deleted: number
  byKind: Record<string, number>
}

export interface ImportOptions {
  /** ID da empresa no Mais Gestão (obrigatório para Postgres) */
  idempresa: string
}

/**
 * Contrato do destino final. Conhece apenas o modelo canônico.
 */
export interface DestinationImporter {
  importAll(
    jobId: string,
    entities: CanonicalEntity[],
    options: ImportOptions
  ): Promise<ImportResult>
  rollback?(jobId: string, entities: CanonicalEntity[]): Promise<RollbackResult>
  getDestinationLabel?(): string
  listEmpresas?(): Promise<DestinoEmpresa[]>
  validateEmpresa?(idempresa: string): Promise<void>
}
