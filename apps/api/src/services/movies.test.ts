import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { db } from '../db.js'
import { truncateAll } from '../test/db.js'
import {
  fakeTmdb,
  heat,
  ownerWithCollection,
  scarface,
} from '../test/fixtures.js'
import { signIn } from './auth.js'
import { addMovie } from './collection-movies.js'
import { searchMovies } from './movies.js'

beforeEach(truncateAll)
afterAll(() => db.$disconnect())

describe('searching movies', () => {
  it('maps the poster url and marks nothing when no collection is named', async () => {
    const user = await signIn('alice')

    expect(
      await searchMovies(fakeTmdb(), user.id, { query: 'heat', page: 1 }),
    ).toEqual({
      page: 1,
      totalPages: 1,
      totalResults: 2,
      results: [
        {
          tmdbId: 949,
          title: 'Heat',
          overview: 'A crew of high-end thieves.',
          posterUrl: `https://image.tmdb.org/t/p/w342${heat.posterPath}`,
          releaseDate: '1995-12-15',
          voteAverage: 7.9,
          inCollection: false,
        },
        expect.objectContaining({
          tmdbId: scarface.tmdbId,
          inCollection: false,
        }),
      ],
    })
  })

  it('flags only the hits the named collection holds', async () => {
    const { user, collection } = await ownerWithCollection('alice')
    const tmdb = fakeTmdb()
    await addMovie(tmdb, user.id, {
      collectionId: collection.id,
      tmdbId: heat.tmdbId,
    })

    const found = await searchMovies(tmdb, user.id, {
      query: 'heat',
      page: 1,
      collectionId: collection.id,
    })

    expect(found.results.map((result) => result.inCollection)).toEqual([
      true,
      false,
    ])
  })

  // Someone else's collection holds nothing as far as this caller can tell,
  // so the flag cannot be used to read what is in it.
  it('flags nothing for a collection belonging to someone else', async () => {
    const alice = await signIn('alice')
    const { user: bob, collection: his } = await ownerWithCollection('bob')
    const tmdb = fakeTmdb()
    await addMovie(tmdb, bob.id, {
      collectionId: his.id,
      tmdbId: heat.tmdbId,
    })

    const found = await searchMovies(tmdb, alice.id, {
      query: 'heat',
      page: 1,
      collectionId: his.id,
    })

    expect(found.results.every((result) => !result.inCollection)).toBe(true)
  })
})
