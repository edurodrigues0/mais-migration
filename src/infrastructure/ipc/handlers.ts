import { dialog, ipcMain, type BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@config/index'
import type { AppServices } from '../../main/bootstrap'
import type { ConfirmImportRequest, RollbackJobRequest, StartPreviewRequest } from '@shared/ipc'

export function registerIpcHandlers(services: AppServices, getWindow: () => BrowserWindow | null): void {
  const { orchestrator, logger } = services

  orchestrator.onProgress((event) => {
    const win = getWindow()
    win?.webContents.send(IPC_CHANNELS.PROGRESS, event)
  })

  ipcMain.handle(IPC_CHANNELS.LIST_PLUGINS, async () => {
    return orchestrator.listPlugins()
  })

  ipcMain.handle(IPC_CHANNELS.LIST_EMPRESAS, async () => {
    return orchestrator.listEmpresas()
  })

  ipcMain.handle(IPC_CHANNELS.START_PREVIEW, async (_event, request: StartPreviewRequest) => {
    logger.info({ pluginId: request.pluginId }, 'IPC startPreview')
    return orchestrator.startPreview(request.pluginId, request.connection)
  })

  ipcMain.handle(IPC_CHANNELS.CONFIRM_IMPORT, async (_event, request: ConfirmImportRequest) => {
    logger.info({ jobId: request.jobId, idempresa: request.idempresa }, 'IPC confirmImport')
    return orchestrator.confirmImport(request.jobId, request.idempresa)
  })

  ipcMain.handle(IPC_CHANNELS.ROLLBACK_JOB, async (_event, request: RollbackJobRequest) => {
    logger.info({ jobId: request.jobId }, 'IPC rollbackJob')
    return orchestrator.rollbackJob(request.jobId)
  })

  ipcMain.handle(IPC_CHANNELS.GET_JOB, async (_event, jobId: string) => {
    return orchestrator.getJob(jobId)
  })

  ipcMain.handle(IPC_CHANNELS.LIST_HISTORY, async () => {
    return orchestrator.listHistory()
  })

  ipcMain.handle(IPC_CHANNELS.OPEN_FDB_DIALOG, async () => {
    const win = getWindow()
    const options: Electron.OpenDialogOptions = {
      title: 'Selecionar banco Clipp (.fdb)',
      properties: ['openFile'],
      filters: [{ name: 'Firebird Database', extensions: ['fdb', 'gdb'] }]
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })
}
