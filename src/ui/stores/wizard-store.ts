import { create } from 'zustand'
import type { MigrationPreview, MigrationReport } from '@domain/migration/types'
import type { ConnectionConfig, PluginMetadata } from '@domain/plugin/types'
import type { DestinoEmpresa, MigrationProgressEvent } from '@shared/ipc'

export type WizardStep =
  | 'select'
  | 'connect'
  | 'running'
  | 'preview'
  | 'report'

const CLIPP_DEFAULTS = {
  host: '127.0.0.1',
  port: '3050',
  user: 'masterkey',
  password: 'masterkey'
} as const

const UNIPLUS_DEFAULTS = {
  host: '127.0.0.1',
  port: '5432',
  database: '',
  user: 'postgres',
  password: '',
  ssl: false
} as const

interface ClippConnectionForm {
  fdbPath: string
  host: string
  port: string
  user: string
  password: string
}

interface UniplusConnectionForm {
  host: string
  port: string
  database: string
  user: string
  password: string
  ssl: boolean
}

interface WizardState {
  step: WizardStep
  plugins: PluginMetadata[]
  selectedPluginId: string | null
  connectionSource: string
  clippConnection: ClippConnectionForm
  uniplusConnection: UniplusConnectionForm
  empresas: DestinoEmpresa[]
  selectedEmpresaId: string | null
  progress: MigrationProgressEvent[]
  preview: MigrationPreview | null
  report: MigrationReport | null
  error: string | null
  busy: boolean
  setPlugins: (plugins: PluginMetadata[]) => void
  selectPlugin: (id: string) => void
  setConnectionSource: (source: string) => void
  setClippConnection: (patch: Partial<ClippConnectionForm>) => void
  setUniplusConnection: (patch: Partial<UniplusConnectionForm>) => void
  setEmpresas: (empresas: DestinoEmpresa[]) => void
  setSelectedEmpresaId: (id: string | null) => void
  buildConnection: () => ConnectionConfig
  setStep: (step: WizardStep) => void
  pushProgress: (event: MigrationProgressEvent) => void
  clearProgress: () => void
  setPreview: (preview: MigrationPreview | null) => void
  setReport: (report: MigrationReport | null) => void
  setError: (error: string | null) => void
  setBusy: (busy: boolean) => void
  reset: () => void
}

const initialClipp: ClippConnectionForm = {
  fdbPath: '',
  host: CLIPP_DEFAULTS.host,
  port: CLIPP_DEFAULTS.port,
  user: CLIPP_DEFAULTS.user,
  password: CLIPP_DEFAULTS.password
}

const initialUniplus: UniplusConnectionForm = {
  host: UNIPLUS_DEFAULTS.host,
  port: UNIPLUS_DEFAULTS.port,
  database: UNIPLUS_DEFAULTS.database,
  user: UNIPLUS_DEFAULTS.user,
  password: UNIPLUS_DEFAULTS.password,
  ssl: UNIPLUS_DEFAULTS.ssl
}

const initial = {
  step: 'select' as WizardStep,
  plugins: [] as PluginMetadata[],
  selectedPluginId: null as string | null,
  connectionSource: 'demo://local',
  clippConnection: initialClipp,
  uniplusConnection: initialUniplus,
  empresas: [] as DestinoEmpresa[],
  selectedEmpresaId: null as string | null,
  progress: [] as MigrationProgressEvent[],
  preview: null as MigrationPreview | null,
  report: null as MigrationReport | null,
  error: null as string | null,
  busy: false
}

export const useWizardStore = create<WizardState>((set, get) => ({
  ...initial,
  setPlugins: (plugins) => set({ plugins }),
  selectPlugin: (id) =>
    set({
      selectedPluginId: id,
      step: 'connect',
      error: null,
      connectionSource: id === 'demo' ? 'demo://local' : get().connectionSource
    }),
  setConnectionSource: (source) => set({ connectionSource: source }),
  setClippConnection: (patch) =>
    set((state) => ({ clippConnection: { ...state.clippConnection, ...patch } })),
  setUniplusConnection: (patch) =>
    set((state) => ({ uniplusConnection: { ...state.uniplusConnection, ...patch } })),
  setEmpresas: (empresas) => set({ empresas }),
  setSelectedEmpresaId: (id) => set({ selectedEmpresaId: id }),
  buildConnection: (): ConnectionConfig => {
    const { selectedPluginId, connectionSource, clippConnection, uniplusConnection } = get()
    if (selectedPluginId === 'clipp') {
      return {
        source: clippConnection.fdbPath.trim(),
        options: {
          host: clippConnection.host.trim() || CLIPP_DEFAULTS.host,
          port: clippConnection.port.trim() || CLIPP_DEFAULTS.port,
          user: clippConnection.user.trim() || CLIPP_DEFAULTS.user,
          password: clippConnection.password
        }
      }
    }
    if (selectedPluginId === 'uniplus') {
      const host = uniplusConnection.host.trim() || UNIPLUS_DEFAULTS.host
      const port = uniplusConnection.port.trim() || UNIPLUS_DEFAULTS.port
      const database = uniplusConnection.database.trim()
      return {
        source: `postgres://${host}:${port}/${database}`,
        options: {
          host,
          port,
          database,
          user: uniplusConnection.user.trim() || UNIPLUS_DEFAULTS.user,
          password: uniplusConnection.password,
          ssl: uniplusConnection.ssl ? 'true' : 'false'
        }
      }
    }
    return { source: connectionSource.trim() }
  },
  setStep: (step) => set({ step }),
  pushProgress: (event) =>
    set((state) => ({ progress: [...state.progress.slice(-40), event] })),
  clearProgress: () => set({ progress: [] }),
  setPreview: (preview) => set({ preview }),
  setReport: (report) => set({ report }),
  setError: (error) => set({ error }),
  setBusy: (busy) => set({ busy }),
  reset: () =>
    set({
      ...initial,
      clippConnection: { ...initialClipp },
      uniplusConnection: { ...initialUniplus },
      empresas: get().empresas
    })
}))
