import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts']
  },
  resolve: {
    alias: {
      '@domain': resolve('src/domain'),
      '@application': resolve('src/application'),
      '@infrastructure': resolve('src/infrastructure'),
      '@plugins': resolve('src/plugins'),
      '@shared': resolve('src/shared'),
      '@database': resolve('src/database'),
      '@config': resolve('src/config')
    }
  }
})
