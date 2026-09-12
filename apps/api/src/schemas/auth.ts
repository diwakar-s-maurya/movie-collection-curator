import { z } from 'zod'

const NAME_MAX_LENGTH = 50

/**
 * Where the normalisation rule is defined and the only place it runs: the
 * procedure validates its input, and `signIn` stores what it is handed. Trim
 * before the length checks, then lowercase, so `Alice`, `alice` and ` Alice `
 * are one person against the unique index on `users.name`.
 */
export const userName = z
  .string()
  .trim()
  .min(1, 'Enter a name.')
  .max(NAME_MAX_LENGTH, `Names are at most ${NAME_MAX_LENGTH} characters.`)
  .toLowerCase()

export const signInInput = z.object({ name: userName })

/** One definition of a user, shared by the wire and the service's type. */
export const user = z.object({ id: z.uuid(), name: z.string() })
