import { z } from 'zod'

const NAME_MAX_LENGTH = 50

/** The sample name the docs show, on the way in and on the way back. */
const NAME_EXAMPLE = 'ada'

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
  .meta({ examples: [NAME_EXAMPLE] })

export const signInInput = z.object({ name: userName })

/** One definition of a user, shared by the wire and the service's type. */
export const user = z.object({
  id: z.uuid().meta({ examples: ['5c9f1a7e-2b84-4d0a-9f3e-1c7b8a6d4e20'] }),
  name: z.string().meta({ examples: [NAME_EXAMPLE] }),
})
