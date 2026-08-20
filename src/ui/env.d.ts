/// <reference types="vite/client" />

import type { MaisMigrationApi } from '@shared/ipc'

declare global {
  interface Window {
    maisMigration: MaisMigrationApi
  }
}

export {}
