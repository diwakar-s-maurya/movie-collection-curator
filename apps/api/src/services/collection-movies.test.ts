import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { db } from '../db.js'
import { truncateAll, warmPool } from '../test/db.js'
import {
  fakeTmdb,
  heat,
  newCollection,
  ownerWithCollection,
} from '../test/fixtures.js'
import { signIn } from './auth.js'
import {
  addMovie,
  type CollectionMoviePage,
  listCollectionMovies,
  removeMovie,
  updateAnnotation,
} from './collection-movies.js'
import { deleteCollection } from './collections.js'

/** Enough adds at once to land on each other. */
const AT_ONCE = 16

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
    const other = await newCollection(user.id, 'Westerns')
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

  /**
   * Two clicks on one Add button, or the same film added from two devices.
   * The membership write reads before it inserts — a `select` that reaches
   * through to the movie cannot be one `ON CONFLICT` statement — so several
   * adds at once all try to insert, and every loser has to come back with the
   * row the winner made rather than a unique violation.
   */
  it('answers every one of several adds of the same film at once', async () => {
    const { user, collection } = await ownerWithCollection('alice')
    const tmdb = fakeTmdb()
    const input = { collectionId: collection.id, tmdbId: heat.tmdbId }
    await warmPool(AT_ONCE)

    const added = await Promise.all(
      Array.from({ length: AT_ONCE }, () => addMovie(tmdb, user.id, input)),
    )

    expect(added.every((movie) => movie?.tmdbId === heat.tmdbId)).toBe(true)
    expect(await db.collectionMovie.count({ where: input })).toBe(1)
  })

  /**
   * The collection is checked and then written to, so it can be deleted in
   * between — on another device, or in another tab. Whichever statement wins,
   * the add answers: a film, or the null a collection that is not there gets.
   * What it must not do is come back with the foreign key's error.
   */
  it('does not fail when the collection goes mid-add', async () => {
    const { user, collection } = await ownerWithCollection('alice')

    const [added] = await Promise.all([
      addMovie(fakeTmdb(), user.id, {
        collectionId: collection.id,
        tmdbId: heat.tmdbId,
      }),
      deleteCollection(user.id, collection.id),
    ])

    expect(added === null || added.tmdbId === heat.tmdbId).toBe(true)
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

  // Null rather than an empty page, so the route answers NOT_FOUND: an empty
  // list would confirm that the id exists and say how the app is shaped.
  it('does not list a collection belonging to someone else', async () => {
    const alice = await signIn('alice')
    const { collection: his } = await stocked('bob', 1)

    expect(
      await listCollectionMovies(alice.id, {
        collectionId: his.id,
        ...firstPage,
      }),
    ).toBeNull()
  })

  it('does not annotate a movie in a collection belonging to someone else', async () => {
    const alice = await signIn('alice')
    const { user: bob, collection: his } = await stocked('bob', 1)
    const movie = { collectionId: his.id, tmdbId: 100 }

    expect(await updateAnnotation(alice.id, { ...movie, rating: 1 })).toBe(
      false,
    )
    // His own write lands, so the false above is the scoping and not a patch
    // that never applied to anyone.
    expect(await updateAnnotation(bob.id, { ...movie, rating: 1 })).toBe(true)
  })
})

/** A catalogue big enough to page through, added in order so the assertions
 * can name the newest. */
function films(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    ...heat,
    tmdbId: 100 + index,
    title: `Film ${index + 1}`,
  }))
}

/** What the procedure's schema fills in when the grid does not say; a direct
 * call states it, since the service no longer parses its own input. */
const firstPage = { page: 1, pageSize: 24 }

function titles(page: CollectionMoviePage | null): string[] {
  return (page?.results ?? []).map((movie) => movie.title)
}

/** A collection holding `count` films, newest last in the catalogue order. */
async function stocked(name: string, count: number) {
  const { user, collection } = await ownerWithCollection(name)
  const catalogue = films(count)
  const tmdb = fakeTmdb(catalogue)

  for (const film of catalogue) {
    await addMovie(tmdb, user.id, {
      collectionId: collection.id,
      tmdbId: film.tmdbId,
    })
  }

  return { user, collection }
}

describe('listing a collection', () => {
  it('pages the movies, newest first', async () => {
    const { user, collection } = await stocked('alice', 5)
    const listPage = (page: number) =>
      listCollectionMovies(user.id, {
        collectionId: collection.id,
        page,
        pageSize: 2,
      })

    const first = await listPage(1)
    expect(first).toMatchObject({ page: 1, totalPages: 3, totalResults: 5 })
    expect(titles(first)).toEqual(['Film 5', 'Film 4'])
    expect(titles(await listPage(2))).toEqual(['Film 3', 'Film 2'])
    // The short last page, and then one past the end: still a page, so the
    // grid renders empty rather than erroring on a stale page number.
    expect(titles(await listPage(3))).toEqual(['Film 1'])
    expect(titles(await listPage(4))).toEqual([])
  })

  it('gives an empty collection a page of nothing', async () => {
    const { user, collection } = await ownerWithCollection('alice')

    expect(
      await listCollectionMovies(user.id, {
        collectionId: collection.id,
        ...firstPage,
      }),
    ).toEqual({ page: 1, totalPages: 0, totalResults: 0, results: [] })
  })

  it('carries the annotation on every row', async () => {
    const { user, collection } = await stocked('alice', 1)
    await updateAnnotation(user.id, {
      collectionId: collection.id,
      tmdbId: 100,
      rating: 4,
      tags: ['noir'],
    })

    const listed = await listCollectionMovies(user.id, {
      collectionId: collection.id,
      ...firstPage,
    })

    expect(listed?.results).toMatchObject([{ rating: 4, tags: ['noir'] }])
  })
})

/** The stored annotation, read back the way the grid reads it. The write
 * itself answers only whether there was a row to write to. */
async function annotationOf(userId: string, collectionId: string) {
  const listed = await listCollectionMovies(userId, {
    collectionId,
    ...firstPage,
  })

  return listed?.results[0]
}

describe('annotating a movie', () => {
  it('writes only the fields the patch carries', async () => {
    const { user, collection } = await stocked('alice', 1)
    const movie = { collectionId: collection.id, tmdbId: 100 }

    expect(
      await updateAnnotation(user.id, {
        ...movie,
        note: 'Seen it twice.',
        tags: ['noir', 'heist'],
      }),
    ).toBe(true)
    expect(await annotationOf(user.id, collection.id)).toMatchObject({
      note: 'Seen it twice.',
      tags: ['noir', 'heist'],
      rating: null,
    })

    // The card's star, which knows nothing about the sheet's fields.
    await updateAnnotation(user.id, { ...movie, rating: 5 })

    expect(await annotationOf(user.id, collection.id)).toMatchObject({
      note: 'Seen it twice.',
      tags: ['noir', 'heist'],
      rating: 5,
    })
  })

  it('clears the note and the rating with null', async () => {
    const { user, collection } = await stocked('alice', 1)
    const movie = { collectionId: collection.id, tmdbId: 100 }
    await updateAnnotation(user.id, { ...movie, note: 'x', rating: 3 })

    await updateAnnotation(user.id, { ...movie, note: null, rating: null })

    expect(await annotationOf(user.id, collection.id)).toMatchObject({
      note: null,
      rating: null,
    })
  })

  it('finds nothing to annotate on a movie that was never added', async () => {
    const { user, collection } = await ownerWithCollection('alice')

    expect(
      await updateAnnotation(user.id, {
        collectionId: collection.id,
        tmdbId: heat.tmdbId,
        rating: 3,
      }),
    ).toBe(false)
  })
})
