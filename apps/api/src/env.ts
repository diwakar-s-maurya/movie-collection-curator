import path from 'node:path'

/**
 * Loads the repo-root `.env` — shared by the API, the web dev server and the
 * Prisma CLI — for the config files that run outside `app.ts`'s own
 * `--env-file-if-exists`. Resolved against the working directory: a path
 * relative to this module would be rewritten when Vite bundles a config that
 * imports it.
 */
export function loadRootEnv(): void {
  try {
    process.loadEnvFile(path.resolve('../../.env'))
  } catch {
    // No .env on disk; the environment may already carry the variables.
  }
}
