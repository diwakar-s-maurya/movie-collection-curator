import { type MovieDetails, posterUrl, type TmdbClient } from '@curator/tmdb'
import type { z } from 'zod'
import { db, type Prisma } from '../db.js'

import {
  type collectionMovie,
  type collectionMovieInput,
  type collectionMoviePage,
  type collectionMoviesListInput,
  genreList,
  type updateAnnotationInput,
} from '../schemas/collection-movies.js'

export type CollectionMovie = z.infer<typeof collectionMovie>
export type CollectionMoviePage = z.infer<typeof collectionMoviePage>

/** Only the snapshot columns a view renders. */
const movieSelect = {
  tmdbId: true,
  title: true,
  overview: true,
  posterPath: true,
  releaseDate: true,
  runtime: true,
  genres: true,
  voteAverage: true,
} as const

/** The membership row and the movie it points at, in one read. */
const collectionMovieSelect = {
  note: true,
  tags: true,
  rating: true,
  movie: { select: movieSelect },
} as const

type MembershipRow = Prisma.CollectionMovieGetPayload<{
  select: typeof collectionMovieSelect
}>

function toCollectionMovie({
  movie,
  ...annotation
}: MembershipRow): CollectionMovie {
  const { posterPath, releaseDate, genres, ...rest } = movie

  return {
    ...rest,
    posterUrl: posterUrl(posterPath),
    posterUrlLarge: posterUrl(posterPath, 'w500'),
    releaseDate: toIsoDate(releaseDate),
    // `genres` is a jsonb column, so its shape is only checked here on read.
    genres: genreList.parse(genres),
    ...annotation,
  }
}

/** The column is `date`, read back as midnight UTC, so the first ten
 * characters are the stored day whatever timezone the server keeps. */
function toIsoDate(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null
}

/** What TMDB said about a movie, as the `movies` row that caches it. The two
 * shapes share field names, so only the date column and the timestamp differ. */
function toSnapshot(details: MovieDetails) {
  return {
    ...details,
    releaseDate: details.releaseDate ? new Date(details.releaseDate) : null,
    fetchedAt: new Date(),
  }
}

/**
 * Adds a movie to the user's collection, caching what TMDB says about it so
 * later reads skip TMDB entirely (README decision 2).
 *
 * Null when the user has no collection with that id — the same answer someone
 * else's collection gets. Add is idempotent: a movie already there returns the
 * row it is on.
 */
export async function addMovie(
  tmdb: TmdbClient,
  userId: string,
  input: z.infer<typeof collectionMovieInput>,
): Promise<CollectionMovie | null> {
  const { collectionId, tmdbId } = input

  // Neither question needs the other's answer, so ask both at once.
  const [owned, cached] = await Promise.all([
    db.collection.findFirst({
      where: { id: collectionId, userId },
      select: { movies: { where: { tmdbId }, select: collectionMovieSelect } },
    }),
    db.movie.findUnique({ where: { tmdbId }, select: { tmdbId: true } }),
  ])
  if (!owned) return null

  const [existing] = owned.movies
  if (existing) return toCollectionMovie(existing)

  if (!cached) {
    // The only TMDB call on a write path, and only for a film nobody has added
    // to any collection before.
    const snapshot = toSnapshot(await tmdb.getMovie(tmdbId))
    // Upsert rather than create: two people adding the same new film at once
    // must be one row, not a unique violation.
    await db.movie.upsert({
      where: { tmdbId },
      create: snapshot,
      update: snapshot,
    })
  }

  const added = await db.collectionMovie.upsert({
    where: { collectionId_tmdbId: { collectionId, tmdbId } },
    create: { collectionId, tmdbId },
    // Nothing to change about a membership that already exists.
    update: {},
    select: collectionMovieSelect,
  })

  return toCollectionMovie(added)
}

/**
 * Removes a movie from the user's collection, and reports whether there was
 * one to remove. The ownership check rides in the `where`, so there is no read
 * to race with. The `movies` snapshot row stays: other collections share it.
 */
export async function removeMovie(
  userId: string,
  input: z.infer<typeof collectionMovieInput>,
): Promise<boolean> {
  const { collectionId, tmdbId } = input

  const { count } = await db.collectionMovie.deleteMany({
    where: { collectionId, tmdbId, collection: { userId } },
  })

  return count > 0
}

/**
 * One page of a collection's movies, newest first. Null when the user has no
 * collection with that id, so a stranger's id is a 404 rather than a list that
 * happens to look empty.
 *
 * Ordering is `(added_at, id)`, the collection's index, so rows added in the
 * same millisecond do not swap places between page loads.
 */
export async function listCollectionMovies(
  userId: string,
  input: z.infer<typeof collectionMoviesListInput>,
): Promise<CollectionMoviePage | null> {
  const { collectionId, page, pageSize } = input

  const [owned, rows] = await Promise.all([
    db.collection.findFirst({
      where: { id: collectionId, userId },
      select: { _count: { select: { movies: true } } },
    }),
    db.collectionMovie.findMany({
      // Ownership is the `findFirst` above, which decides whether these rows
      // are returned at all.
      where: { collectionId },
      orderBy: [{ addedAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: collectionMovieSelect,
    }),
  ])
  if (!owned) return null

  const totalResults = owned._count.movies

  return {
    page,
    totalPages: Math.ceil(totalResults / pageSize),
    totalResults,
    results: rows.map(toCollectionMovie),
  }
}

/**
 * Writes the fields the patch carries onto one membership row, and reports
 * whether there was such a row. False covers someone else's collection, a film
 * that was never added, and one removed on another device.
 *
 * Ownership rides in the `where`, as in `removeMovie`. Nothing is read back:
 * the client already holds the row and normalises by the same rules.
 */
export async function updateAnnotation(
  userId: string,
  input: z.infer<typeof updateAnnotationInput>,
): Promise<boolean> {
  const { collectionId, tmdbId, ...annotation } = input

  const { count } = await db.collectionMovie.updateMany({
    where: { collectionId, tmdbId, collection: { userId } },
    // Prisma leaves absent columns alone, so the patch needs no translation.
    data: annotation,
  })

  return count > 0
}
