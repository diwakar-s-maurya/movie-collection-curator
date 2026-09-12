import { defineConfig } from 'vitest/config'

import { loadRootEnv } from './src/env.js'

loadRootEnv()

/**
 * The suite truncates every table, so be certain before anything connects that
 * it is not pointed at the dev database. `src/db.ts` checks which *variable* it
 * reads; this checks the *value*, and this is the only place both are still
 * visible.
 */
const databaseName = (url: string) => new URL(url).pathname

if (
  process.env.TEST_DATABASE_URL &&
  process.env.DATABASE_URL &&
  databaseName(process.env.TEST_DATABASE_URL) ===
    databaseName(process.env.DATABASE_URL)
) {
  throw new Error(
    'TEST_DATABASE_URL names the same database as DATABASE_URL, and the suite truncates every table — see .env.example',
  )
}

// A worker inherits this process's environment, so loading the root `.env` is
// what put the dev database within reach. A test run has no use for it.
delete process.env.DATABASE_URL

export default defineConfig({
  test: {
    // The one variable the suite is allowed to know, handed to the workers on
    // its own so it reaches them whichever pool runs them.
    env: { TEST_DATABASE_URL: process.env.TEST_DATABASE_URL ?? '' },
    globalSetup: ['./src/test/migrate.ts'],
    // One database, truncated between cases: files cannot run side by side.
    fileParallelism: false,
  },
})
