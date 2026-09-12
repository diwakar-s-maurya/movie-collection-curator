import path from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const rootDir = path.resolve(import.meta.dirname, '../..')

/**
 * Deny everything, then allow one thing per line with a reason. The two
 * loosenings marked `dev` are the dev server's own: Fast Refresh injects an
 * inline preamble script and HMR runs over a websocket, neither of which a
 * built bundle contains.
 */
const csp = (dev: boolean) =>
  [
    "default-src 'none'",
    `script-src 'self'${dev ? " 'unsafe-inline'" : ''}`,
    // Unavoidable: React writes `style` attributes (Base UI positions its
    // popovers that way) and Sonner appends a <style> element at runtime.
    // Tailwind's own output is a file, covered by 'self'.
    "style-src 'self' 'unsafe-inline'",
    // Posters load from TMDB directly (packages/tmdb/src/images.ts owns the
    // host); `data:` is the inline favicon.
    "img-src 'self' data: https://image.tmdb.org",
    "font-src 'self'", // Geist is bundled by Fontsource, not fetched.
    `connect-src 'self'${dev ? ' ws:' : ''}`, // The API is same-origin.
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')

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
      headers: {
        'Content-Security-Policy': csp(true),
        'X-Content-Type-Options': 'nosniff',
      },
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
    // The policy a real host would have to send: this repo ships no
    // production server (README, "No Docker"), so preview is where the built
    // bundle is actually served under it.
    preview: {
      headers: {
        'Content-Security-Policy': csp(false),
        'X-Content-Type-Options': 'nosniff',
      },
    },
  }
})
