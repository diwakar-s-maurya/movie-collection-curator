import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { db } from '../db.js'
import { truncateAll } from '../test/db.js'
import { fakeTmdb, heat, ownerWithCollection } from '../test/fixtures.js'
import { signIn } from './auth.js'
import { addMovie, removeMovie } from './collection-movies.js'
import { createCollection } from './collections.js'

beforeEach(truncateAll)
afterAll(() => db.$disconnect())

describe('adding a movie', () => {
  it('stores the TMDB snapshot and returns it with an empty annotation', async () => {
    const { user, collection } = await ownerWithCollection('alice')

    expect(
      await addMovie(fakeTmdb(), user.id, {
        collectionId: collection.id,
        tmdbId: heat.tmdbId,
      }),
    ).toEqual({
      tmdbId: 949,
      title: 'Heat',
      overview: 'A crew of high-end thieves.',
      posterUrl: `https://image.tmdb.org/t/p/w342${heat.posterPath}`,
      posterUrlLarge: `https://image.tmdb.org/t/p/w500${heat.posterPath}`,
      releaseDate: '1995-12-15',
      runtime: 170,
      genres: heat.genres,
      voteAverage: 7.9,
      note: null,
      tags: [],
      rating: null,
    })
  })

  // The add button is one click from a search hit that already says "Added",
  // so the second add has to be a no-op rather than a unique violation.
  it('returns the existing row without asking TMDB again', async () => {
    const { user, collection } = await ownerWithCollection('alice')
    const tmdb = fakeTmdb()
    const input = { collectionId: collection.id, tmdbId: heat.tmdbId }

    const first = await addMovie(tmdb, user.id, input)
    const again = await addMovie(tmdb, user.id, input)

    expect(again).toEqual(first)
    expect(tmdb.getMovie).toHaveBeenCalledTimes(1)
  })

  // The point of the snapshot: the second collection to hold a film is served
  // from the cache, whoever added it first.
  it('serves a film another collection already holds from the cache', async () => {
    const { user, collection } = await ownerWithCollection('alice')
    const other = await createCollection(user.id, {
      name: 'Westerns',
      description: null,
    })
    const tmdb = fakeTmdb()

    const hers = await addMovie(tmdb, user.id, {
      collectionId: collection.id,
      tmdbId: heat.tmdbId,
    })
    const copy = await addMovie(tmdb, user.id, {
      collectionId: other.id,
      tmdbId: heat.tmdbId,
    })

    expect(copy).toEqual(hers)
    expect(tmdb.getMovie).toHaveBeenCalledTimes(1)
  })

  it('keeps a movie TMDB has no date or runtime for', async () => {
    const { user, collection } = await ownerWithCollection('alice')
    const unreleased = { ...heat, releaseDate: null, runtime: null }

    const added = await addMovie(fakeTmdb([unreleased]), user.id, {
      collectionId: collection.id,
      tmdbId: heat.tmdbId,
    })

    expect(added).toMatchObject({ releaseDate: null, runtime: null })
  })
})

describe('scoping to the owner', () => {
  it('does not add to a collection belonging to someone else', async () => {
    const alice = await signIn('alice')
    const { collection: his } = await ownerWithCollection('bob')
    const tmdb = fakeTmdb()

    expect(
      await addMovie(tmdb, alice.id, {
        collectionId: his.id,
        tmdbId: heat.tmdbId,
      }),
    ).toBeNull()
    // The ownership check comes before the upstream call, so a stranger
    // cannot spend this app's TMDB budget.
    expect(tmdb.getMovie).not.toHaveBeenCalled()
  })

  it('does not remove from a collection belonging to someone else', async () => {
    const alice = await signIn('alice')
    const { user: bob, collection: his } = await ownerWithCollection('bob')
    const input = { collectionId: his.id, tmdbId: heat.tmdbId }
    await addMovie(fakeTmdb(), bob.id, input)

    expect(await removeMovie(alice.id, input)).toBe(false)
    expect(await removeMovie(bob.id, input)).toBe(true)
    // Gone once, and a second remove is a miss rather than an error.
    expect(await removeMovie(bob.id, input)).toBe(false)
  })
})
