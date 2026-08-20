import { app, BrowserWindow, dialog, shell } from 'electron'
import { join } from 'path'
import { bootstrapServices } from './bootstrap'
import { registerIpcHandlers } from '@infrastructure/ipc/handlers'
import { APP_NAME } from '@config/index'
import { isConnectionError } from '@infrastructure/db/pg-errors'

process.on('uncaughtException', (error) => {
  if (isConnectionError(error)) {
    console.warn('[postgres]', error.message)
    return
  }
  console.error(error)
})

process.on('unhandledRejection', (reason) => {
  if (isConnectionError(reason)) {
    console.warn('[postgres]', reason instanceof Error ? reason.message : String(reason))
    return
  }
  console.error(reason)
})

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 960,
    minHeight: 640,
    title: APP_NAME,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  try {
    const services = await bootstrapServices()
    registerIpcHandlers(services, () => mainWindow)
    createWindow()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    dialog.showErrorBox(APP_NAME, message)
    app.quit()
    return
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
