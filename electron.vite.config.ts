import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

const aliases = {
  '@domain': resolve('src/domain'),
  '@application': resolve('src/application'),
  '@infrastructure': resolve('src/infrastructure'),
  '@plugins': resolve('src/plugins'),
  '@shared': resolve('src/shared'),
  '@database': resolve('src/database'),
  '@config': resolve('src/config'),
  '@ui': resolve('src/ui')
}

/** Electron 22 ≈ Node 16 — alinhado ao build legado Win7. */
const electron22Target = 'node16'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: aliases },
    build: {
      target: electron22Target,
      rollupOptions: {
        input: {
          index: resolve('src/main/index.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: aliases },
    build: {
      target: electron22Target,
      rollupOptions: {
        input: {
          index: resolve('src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    root: resolve('src/ui'),
    resolve: { alias: aliases },
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/ui/index.html')
        }
      }
    }
  }
})
