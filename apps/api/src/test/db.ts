import { db } from '../db.js'

/**
 * Every table, emptied in one statement. Listed rather than discovered from the
 * catalog: a new table nobody added here is a test leaking rows into the next
 * case, which is worth the edit.
 *
 * Which database this reaches is `src/db.ts`'s decision: under Vitest it
 * resolves `TEST_DATABASE_URL` and refuses to fall back.
 */
export async function truncateAll(): Promise<void> {
  await db.$executeRawUnsafe(
    'TRUNCATE users, collections, movies, collection_movies CASCADE',
  )
}

/**
 * A connection each for `count` callers, opened before a test races them.
 * The pool hands out its first connections one at a time, which is enough to
 * serialise the calls under test and hide the very race being asserted.
 */
export async function warmPool(count: number): Promise<void> {
  await Promise.all(Array.from({ length: count }, () => db.$queryRaw`SELECT 1`))
}
