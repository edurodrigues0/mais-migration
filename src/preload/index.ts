import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../config/index'
import type {
  ConfirmImportRequest,
  MaisMigrationApi,
  MigrationProgressEvent,
  RollbackJobRequest,
  StartPreviewRequest
} from '../shared/ipc'

const api: MaisMigrationApi = {
  listPlugins: () => ipcRenderer.invoke(IPC_CHANNELS.LIST_PLUGINS),
  listEmpresas: () => ipcRenderer.invoke(IPC_CHANNELS.LIST_EMPRESAS),
  startPreview: (request: StartPreviewRequest) => ipcRenderer.invoke(IPC_CHANNELS.START_PREVIEW, request),
  confirmImport: (request: ConfirmImportRequest) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONFIRM_IMPORT, request),
  rollbackJob: (request: RollbackJobRequest) =>
    ipcRenderer.invoke(IPC_CHANNELS.ROLLBACK_JOB, request),
  getJob: (jobId: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_JOB, jobId),
  listHistory: () => ipcRenderer.invoke(IPC_CHANNELS.LIST_HISTORY),
  openFdbDialog: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_FDB_DIALOG),
  onProgress: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: MigrationProgressEvent) => {
      callback(payload)
    }
    ipcRenderer.on(IPC_CHANNELS.PROGRESS, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.PROGRESS, listener)
    }
  }
}

contextBridge.exposeInMainWorld('maisMigration', api)
