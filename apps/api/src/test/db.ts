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
