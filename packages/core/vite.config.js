import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: {
        xVirtualCore: './lib/index.js',
      },
      name: 'xVirtualCore',
      fileName: 'xVirtualCore',
    },
  },
})
