import type { MigrationJob, MigrationPreview, MigrationReport } from '@domain/migration/types'
import type { PluginMetadata, ConnectionConfig } from '@domain/plugin/types'

export interface DestinoEmpresa {
  id: string
  nome: string
  cnpj: string
}

export interface StartPreviewRequest {
  pluginId: string
  connection: ConnectionConfig
}

export interface ConfirmImportRequest {
  jobId: string
  idempresa: string
}

export interface RollbackJobRequest {
  jobId: string
}

export interface MigrationProgressEvent {
  jobId: string
  stage: string
  message: string
  processed: number
  total?: number
}

export interface MaisMigrationApi {
  listPlugins: () => Promise<PluginMetadata[]>
  listEmpresas: () => Promise<DestinoEmpresa[]>
  startPreview: (request: StartPreviewRequest) => Promise<MigrationPreview>
  confirmImport: (request: ConfirmImportRequest) => Promise<MigrationReport>
  rollbackJob: (request: RollbackJobRequest) => Promise<MigrationJob>
  getJob: (jobId: string) => Promise<MigrationJob | null>
  listHistory: () => Promise<MigrationJob[]>
  openFdbDialog: () => Promise<string | null>
  onProgress: (callback: (event: MigrationProgressEvent) => void) => () => void
}

declare global {
  interface Window {
    maisMigration: MaisMigrationApi
  }
}

export { }
