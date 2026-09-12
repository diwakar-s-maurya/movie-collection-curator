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
    // Nothing to change about an existing user: the row is the sign-in.
    update: {},
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
