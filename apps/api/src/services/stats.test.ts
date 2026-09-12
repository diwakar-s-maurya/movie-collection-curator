import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { db } from '../db.js'
import { truncateAll } from '../test/db.js'
import { ownerWithCollection } from '../test/fixtures.js'
import {
  createCollection,
  findCollection,
  listCollections,
} from './collections.js'
import { statsFor } from './stats.js'

beforeEach(truncateAll)
afterAll(() => db.$disconnect())

/** One film in a collection, as the two tables hold it: what TMDB said about
 * the movie, and what the user said about it here. Every field has a default,
 * so a case names only what it is about. */
type Film = {
  runtime?: number | null
  year?: number | null
  genres?: string[]
  rating?: number | null
  tags?: string[]
}

/** Ids only have to be unique, and nothing reads them back. */
let nextTmdbId = 1

/**
 * Rows written straight into `movies` and `collection_movies`. Going through
 * `addMovie` would mean a TMDB fixture per film and no honest way to say "TMDB
 * has no runtime for this one"; the stats queries only ever see these two
 * tables, so this is the whole world they live in.
 */
async function stock(collectionId: string, films: Film[]): Promise<void> {
  for (const film of films) {
    const {
      runtime = 100,
      year = 2000,
      genres = [],
      rating = null,
      tags = [],
    } = film
    const tmdbId = nextTmdbId++

    await db.movie.create({
      data: {
        tmdbId,
        title: `Film ${tmdbId}`,
        overview: '',
        // Mid-year, so the year the span reports is the stored one whatever
        // timezone reads the column.
        releaseDate: year === null ? null : new Date(Date.UTC(year, 5, 1)),
        runtime,
        genres: genres.map((name, index) => ({ id: index + 1, name })),
        voteAverage: 7,
      },
    })
    await db.collectionMovie.create({
      data: { collectionId, tmdbId, rating, tags },
    })
  }
}

describe('the summary', () => {
  it('counts, sums and spans what the collection holds', async () => {
    const { collection } = await ownerWithCollection('alice')
    await stock(collection.id, [
      { runtime: 170, year: 1995, rating: 5 },
      { runtime: 90, year: 1972, rating: 4 },
      { runtime: 120, year: 2019, rating: null },
    ])

    expect(await statsFor(collection.id)).toMatchObject({
      movieCount: 3,
      runtimeMinutes: 380,
      // The average is of the ratings that exist, not of the movies: two of
      // three rated is 4.5, not 3.
      ratedCount: 2,
      averageRating: 4.5,
      yearMin: 1972,
      yearMax: 2019,
    })
  })

  it('reads an empty collection as zeros and nothing else', async () => {
    const { collection } = await ownerWithCollection('alice')

    // There is no row to group, so every one of these is filled in rather
    // than read.
    expect(await statsFor(collection.id)).toEqual({
      movieCount: 0,
      runtimeMinutes: 0,
      ratedCount: 0,
      averageRating: null,
      yearMin: null,
      yearMax: null,
      genres: [],
      tags: [],
    })
  })

  it('has no average until something is rated', async () => {
    const { collection } = await ownerWithCollection('alice')
    await stock(collection.id, [{}, {}])

    expect(await statsFor(collection.id)).toMatchObject({
      movieCount: 2,
      ratedCount: 0,
      // Null, not 0: an unrated collection has no opinion, and a 0 would draw
      // an empty star row as if it did.
      averageRating: null,
    })
  })

  it('counts a film TMDB has no runtime or date for without summing it', async () => {
    const { collection } = await ownerWithCollection('alice')
    await stock(collection.id, [
      { runtime: 170, year: 1995 },
      { runtime: null, year: null },
    ])

    expect(await statsFor(collection.id)).toMatchObject({
      movieCount: 2,
      runtimeMinutes: 170,
      // One dated film is a span of one year, which the strip shows as the
      // year on its own.
      yearMin: 1995,
      yearMax: 1995,
    })
  })

  it('describes only the collection it was asked about', async () => {
    const { user, collection } = await ownerWithCollection('alice')
    const other = await createCollection(user.id, {
      name: 'Westerns',
      description: null,
    })
    await stock(collection.id, [{ runtime: 170, genres: ['Crime'] }])
    await stock(other.id, [
      { runtime: 90, genres: ['Western'], tags: ['dusty'] },
    ])

    expect(await statsFor(collection.id)).toMatchObject({
      movieCount: 1,
      runtimeMinutes: 170,
      genres: [{ name: 'Crime', count: 1 }],
      tags: [],
    })
  })
})

describe('the breakdowns', () => {
  it('takes the top five genres and breaks ties by name', async () => {
    const { collection } = await ownerWithCollection('alice')
    // Crime is in all six; the other six labels have one film each, so the
    // cut and the tie order are the only things deciding what comes back.
    await stock(
      collection.id,
      ['Action', 'Drama', 'Western', 'Horror', 'Comedy', 'Romance'].map(
        (genre) => ({ genres: ['Crime', genre] }),
      ),
    )

    expect((await statsFor(collection.id)).genres).toEqual([
      { name: 'Crime', count: 6 },
      { name: 'Action', count: 1 },
      { name: 'Comedy', count: 1 },
      { name: 'Drama', count: 1 },
      { name: 'Horror', count: 1 },
    ])
  })

  it('counts the tags the user typed, and no row for a film without any', async () => {
    const { collection } = await ownerWithCollection('alice')
    await stock(collection.id, [
      { tags: ['noir', 'rewatch'] },
      { tags: ['noir'] },
      { tags: [] },
    ])

    expect((await statsFor(collection.id)).tags).toEqual([
      { name: 'noir', count: 2 },
      { name: 'rewatch', count: 1 },
    ])
  })
})

// The stats are only worth anything where the views read them, and the list
// reads them a different way from the detail page.
describe('wired into the collection views', () => {
  it('gives every card on the list its own summary', async () => {
    const { user, collection } = await ownerWithCollection('alice')
    const empty = await createCollection(user.id, {
      name: 'Westerns',
      description: null,
    })
    await stock(collection.id, [{ runtime: 170, rating: 5 }])

    expect(
      (await listCollections(user.id, { page: 1, pageSize: 24 })).results,
    ).toMatchObject([
      { id: empty.id, stats: { movieCount: 0, averageRating: null } },
      {
        id: collection.id,
        stats: { movieCount: 1, runtimeMinutes: 170, averageRating: 5 },
      },
    ])
  })

  it('carries the breakdowns on the collection’s own page', async () => {
    const { user, collection } = await ownerWithCollection('alice')
    await stock(collection.id, [{ genres: ['Crime'], tags: ['noir'] }])

    expect(await findCollection(user.id, collection.id)).toMatchObject({
      name: 'Noir',
      stats: {
        movieCount: 1,
        genres: [{ name: 'Crime', count: 1 }],
        tags: [{ name: 'noir', count: 1 }],
      },
    })
  })
})
