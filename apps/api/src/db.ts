import { PrismaPg } from '@prisma/adapter-pg'

import { Prisma, PrismaClient } from './generated/prisma/client.js'

/** The type a caller names when it holds the client; nothing else imports the
 * generated path. */
export type Db = PrismaClient

/**
 * Prisma's own type helpers, re-exported for the same reason: a service names
 * the row a `select` produces as `Prisma.XGetPayload<{ select: typeof xSelect }>`
 * without reaching into `generated/`.
 */
export type { Prisma }

/** Postgres rejected a write for a unique index — asked here so a service
 * does not have to import Prisma's error class from the generated path. */
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  )
}

/**
 * Which database this process talks to, decided here and nowhere else.
 *
 * Under Vitest the answer is `TEST_DATABASE_URL` or an error, never a fallback
 * to `DATABASE_URL`: the suite truncates every table between cases, and the
 * root `.env` carries both variables. This branch is what keeps `pnpm test`
 * off the database a demo is running against.
 */
function connectionString(): string {
  const variable = process.env.VITEST ? 'TEST_DATABASE_URL' : 'DATABASE_URL'
  const url = process.env[variable]

  if (!url) {
    // Thrown at import, not on the first query with a user waiting.
    throw new Error(`${variable} is not set — see .env.example`)
  }

  return url
}

/**
 * The one client this process has. Services import it rather than taking a
 * `db` argument, so there is no second instance to construct by accident and
 * no pool to leak. Constructing it opens nothing — Prisma connects on the
 * first query.
 *
 * A transaction still works inside the service that owns the write. What goes
 * away is a transaction spanning several services, since none of them takes a
 * client to hand `tx` to; if one is ever wanted, it is an AsyncLocalStorage
 * context here rather than a parameter on every function.
 */
export const db: Db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: connectionString() }),
})
