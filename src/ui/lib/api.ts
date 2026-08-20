import type { MaisMigrationApi } from '@shared/ipc'
import type { ConnectionConfig } from '@domain/plugin/types'

function getApi(): MaisMigrationApi {
  if (!window.maisMigration) {
    throw new Error('API Electron indisponível. Execute via electron-vite.')
  }
  const api = window.maisMigration
  if (typeof api.rollbackJob !== 'function') {
    throw new Error(
      'API desatualizada (rollbackJob ausente). Pare o app e rode novamente: npm run dev'
    )
  }
  return api
}

export const migrationApi = {
  listPlugins: () => getApi().listPlugins(),
  listEmpresas: () => getApi().listEmpresas(),
  startPreview: (pluginId: string, connection: ConnectionConfig) =>
    getApi().startPreview({ pluginId, connection }),
  confirmImport: (jobId: string, idempresa: string) =>
    getApi().confirmImport({ jobId, idempresa }),
  rollbackJob: (jobId: string) => getApi().rollbackJob({ jobId }),
  getJob: (jobId: string) => getApi().getJob(jobId),
  listHistory: () => getApi().listHistory(),
  openFdbDialog: () => getApi().openFdbDialog(),
  onProgress: (cb: Parameters<MaisMigrationApi['onProgress']>[0]) => getApi().onProgress(cb)
}
