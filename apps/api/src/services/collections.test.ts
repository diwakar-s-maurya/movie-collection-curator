import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { db } from '../db.js'
import { truncateAll } from '../test/db.js'
import { newCollection } from '../test/fixtures.js'
import { signIn } from './auth.js'
import {
  createCollection,
  deleteCollection,
  findCollection,
  listCollections,
} from './collections.js'

/** What the procedure's schema fills in when the caller does not say; a direct
 * call states it, since the service no longer parses its own input. */
const firstPage = { page: 1, pageSize: 24 }

/** The collections on a page, newest first. */
async function names(userId: string, input = firstPage) {
  const listed = await listCollections(userId, input)

  return listed.results.map((collection) => collection.name)
}

/** Two people with a collection each, which is the whole fixture for scoping. */
async function twoOwners() {
  const [alice, bob] = await Promise.all([signIn('alice'), signIn('bob')])
  const [hers, his] = await Promise.all([
    newCollection(alice.id, 'Noir'),
    newCollection(bob.id, 'Westerns'),
  ])

  return { alice, bob, hers, his }
}

beforeEach(truncateAll)
afterAll(() => db.$disconnect())

describe('collections', () => {
  // The summary behind each card aggregates that collection's rows, so the
  // list is paged like the grid rather than returned whole.
  it('pages the collections, newest first', async () => {
    const user = await signIn('alice')
    for (const name of ['One', 'Two', 'Three']) {
      await newCollection(user.id, name)
    }
    const page = (page: number) => ({ page, pageSize: 2 })

    const first = await listCollections(user.id, page(1))
    expect(first).toMatchObject({ page: 1, totalPages: 2, totalResults: 3 })
    expect(await names(user.id, page(1))).toEqual(['Three', 'Two'])
    expect(await names(user.id, page(2))).toEqual(['One'])
    // One past the end is still a page, so a stale page number renders empty
    // rather than erroring.
    expect(await names(user.id, page(3))).toEqual([])
  })

  it('gives a user with no collections a page of nothing', async () => {
    const user = await signIn('alice')

    expect(await listCollections(user.id, firstPage)).toEqual({
      page: 1,
      totalPages: 0,
      totalResults: 0,
      results: [],
    })
  })

  it('lists newest first', async () => {
    const user = await signIn('alice')
    const first = await newCollection(user.id, 'Noir')
    const second = await newCollection(user.id, 'Westerns')

    // Stats ride along on every card; what they hold is stats.test.ts.
    expect((await listCollections(user.id, firstPage)).results).toMatchObject([
      { id: second.id },
      { id: first.id },
    ])
  })
})

// A name is how the user tells one card from another, so a second collection
// by that name is refused rather than stored as a card nobody can place.
describe('one name per user', () => {
  const noir = { name: 'Noir', description: null }

  it('refuses a name the user already has, whatever its case', async () => {
    const user = await signIn('alice')
    await createCollection(user.id, noir)

    expect(await createCollection(user.id, noir)).toBeNull()
    expect(
      await createCollection(user.id, { ...noir, name: 'NOIR' }),
    ).toBeNull()
    // The rule rejects the second name; it does not rewrite the first.
    expect(await names(user.id)).toEqual(['Noir'])
  })

  it('frees the name again when the collection is deleted', async () => {
    const user = await signIn('alice')
    const first = await newCollection(user.id, 'Noir')
    await deleteCollection(user.id, first.id)

    expect(await createCollection(user.id, noir)).not.toBeNull()
  })

  it('scopes the name to its owner', async () => {
    // Alice already owns the only Noir there is.
    const { bob } = await twoOwners()

    expect(await createCollection(bob.id, noir)).not.toBeNull()
    expect(await names(bob.id)).toEqual(['Noir', 'Westerns'])
  })
})

// The requirement's "assume multiple users": every read and write is scoped by
// the owner, and someone else's collection is missing rather than forbidden.
describe('scoping to the owner', () => {
  it('lists only the owner’s collections', async () => {
    const { alice, hers } = await twoOwners()

    expect((await listCollections(alice.id, firstPage)).results).toMatchObject([
      { id: hers.id },
    ])
  })

  it('finds nothing when the collection belongs to someone else', async () => {
    const { alice, his } = await twoOwners()

    expect(await findCollection(alice.id, his.id)).toBeNull()
    // Same answer as an id that exists nowhere, so the API cannot be used to
    // learn which ids are real.
    expect(await findCollection(alice.id, crypto.randomUUID())).toBeNull()
  })

  it('does not delete a collection belonging to someone else', async () => {
    const { alice, bob, his } = await twoOwners()

    expect(await deleteCollection(alice.id, his.id)).toBe(false)
    expect(await findCollection(bob.id, his.id)).toMatchObject(his)

    expect(await deleteCollection(bob.id, his.id)).toBe(true)
    expect(await findCollection(bob.id, his.id)).toBeNull()
  })
})
