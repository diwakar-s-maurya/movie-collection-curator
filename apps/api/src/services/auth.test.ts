import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { db } from '../db.js'
import { truncateAll, warmPool } from '../test/db.js'
import { signIn } from './auth.js'

/** Enough calls at once to land on each other, shared by both race tests. */
const AT_ONCE = 16

beforeEach(truncateAll)
afterAll(() => db.$disconnect())

describe('signing in', () => {
  it('creates the user a new name names', async () => {
    const user = await signIn('alice')

    expect(user.name).toBe('alice')
    expect(await db.user.count()).toBe(1)
  })

  it('returns the same user the second time', async () => {
    expect(await signIn('alice')).toEqual(await signIn('alice'))
  })

  /**
   * A new name is created by the sign-in that first uses it, so two browsers
   * opening the app at once race each other for the insert. The loser has to
   * come back with the winner's user; it gets a unique violation instead the
   * moment the upsert stops being a single statement.
   */
  it('gives every simultaneous first sign-in the same user', async () => {
    await warmPool(AT_ONCE)

    const signedIn = await Promise.all(
      Array.from({ length: AT_ONCE }, () => signIn('alice')),
    )

    expect(new Set(signedIn.map(({ id }) => id)).size).toBe(1)
    expect(await db.user.count()).toBe(1)
  })
})
