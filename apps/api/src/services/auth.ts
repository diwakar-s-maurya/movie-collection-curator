import { z } from 'zod'

import { db } from '../db.js'
import type { user } from '../schemas/auth.js'

export type User = z.infer<typeof user>

/** Kept beside the type so a new field is one edit, not one per query. */
const userSelect = { id: true, name: true } as const

/**
 * Signs in by name alone: an existing name is a sign-in, a new one creates the
 * user. There is no password — README decision 7 says why, and what it costs.
 *
 * The upsert makes lookup-or-insert one statement, so two browsers signing in
 * as the same new name at once produce one user, not a unique violation.
 */
export async function signIn(name: string): Promise<User> {
  return db.user.upsert({
    where: { name },
    create: { name },
    // There is nothing to change about an existing user — the row is the
    // sign-in — but the no-op has to name a column: an empty `update` is what
    // decides whether this is one statement or three. Prisma compiles this to
    // `INSERT ... ON CONFLICT DO UPDATE`, and compiles `update: {}` to a
    // SELECT and then an INSERT, which is two browsers racing for the same
    // new name and one of them getting a unique violation.
    update: { name },
    select: userSelect,
  })
}

/** The user an id points at, or null when it points at nobody. */
export async function findUser(id: string): Promise<User | null> {
  // The id comes from a cookie, and the column is `uuid`: `nonsense` is not a
  // miss, it is a Postgres cast error on a value a stranger chose.
  const parsed = z.uuid().safeParse(id)
  if (!parsed.success) return null

  return db.user.findUnique({ where: { id: parsed.data }, select: userSelect })
}
