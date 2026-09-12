import path from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const rootDir = path.resolve(import.meta.dirname, '../..')

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // One .env for the whole repo, at the root, so there is a single answer to
  // "where do env vars live". `loadEnv` with an empty prefix also gives us the
  // API's PORT, which the dev proxy has to agree with.
  const env = loadEnv(mode, rootDir, '')

  return {
    envDir: rootDir,
    plugins: [devtools(), react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, './src') },
    },
    server: {
      proxy: {
        // The browser only ever talks to this origin, so the session cookie is
        // same-origin and the API needs no CORS setup. The prefix is stripped
        // because the API mounts its handler at the root.
        '/api': {
          target: `http://localhost:${env.PORT ?? 3000}`,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
    },
  }
})
