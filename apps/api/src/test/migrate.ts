import { execSync } from 'node:child_process'

/**
 * Brings the test database up to the current migrations once, before the suite
 * runs, so a fresh checkout needs no setup step of its own. It is the same
 * `migrate deploy` the dev database gets, pointed at `TEST_DATABASE_URL` by
 * `prisma.test.config.ts` — there is no path from here to `DATABASE_URL`.
 */
export default function setup(): void {
  execSync('pnpm db:deploy:test', { stdio: 'inherit' })
}
