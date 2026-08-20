export const APP_NAME = 'MAIS Migration'
export const APP_VERSION = '0.1.0'

export const IPC_CHANNELS = {
  LIST_PLUGINS: 'migration:list-plugins',
  LIST_EMPRESAS: 'migration:list-empresas',
  START_PREVIEW: 'migration:start-preview',
  CONFIRM_IMPORT: 'migration:confirm-import',
  ROLLBACK_JOB: 'migration:rollback-job',
  GET_JOB: 'migration:get-job',
  LIST_HISTORY: 'migration:list-history',
  PROGRESS: 'migration:progress',
  OPEN_FDB_DIALOG: 'dialog:open-fdb'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
