import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'electron-vite'

const rootDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  main: {
    build: {
      outDir: 'out/main',
      rollupOptions: {
        input: {
          index: resolve(rootDir, 'src/main/index.ts')
        }
      }
    }
  },
  preload: {
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: {
          index: resolve(rootDir, 'src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    root: resolve(rootDir, 'src/renderer'),
    base: './',
    plugins: [vue()],
    build: {
      outDir: resolve(rootDir, 'out/renderer'),
      rollupOptions: {
        input: {
          index: resolve(rootDir, 'src/renderer/index.html')
        }
      }
    }
  }
})
