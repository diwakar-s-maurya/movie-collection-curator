import { posterUrl, type TmdbClient } from '@curator/tmdb'
import type { z } from 'zod'

import { db } from '../db.js'
import type { movieSearchInput, movieSearchPage } from '../schemas/movies.js'

export type MovieSearchPage = z.infer<typeof movieSearchPage>

/**
 * Searches TMDB, and marks the hits the caller's collection already holds so
 * the dialog can render "Added" instead of an add button. Nothing from a
 * search is stored: a movie only becomes a row when someone adds it.
 */
export async function searchMovies(
  tmdb: TmdbClient,
  userId: string,
  input: z.infer<typeof movieSearchInput>,
): Promise<MovieSearchPage> {
  const { query, page, collectionId } = input

  const found = await tmdb.searchMovies(query, { page })
  const held = await heldTmdbIds(
    userId,
    collectionId,
    found.results.map((result) => result.tmdbId),
  )

  return {
    page: found.page,
    totalPages: found.totalPages,
    totalResults: found.totalResults,
    // Every field but the poster passes straight through: the library's DTO is
    // already this app's shape.
    results: found.results.map(({ posterPath, ...result }) => ({
      ...result,
      posterUrl: posterUrl(posterPath),
      inCollection: held.has(result.tmdbId),
    })),
  }
}

/**
 * Which of this page's movies are already in the collection, in one query
 * against the unique `(collection_id, tmdb_id)` index. Ownership rides in the
 * `where` rather than raising, so someone else's collection reads as empty.
 */
async function heldTmdbIds(
  userId: string,
  collectionId: string | undefined,
  tmdbIds: number[],
): Promise<Set<number>> {
  if (!collectionId || tmdbIds.length === 0) return new Set()

  const rows = await db.collectionMovie.findMany({
    where: { collectionId, tmdbId: { in: tmdbIds }, collection: { userId } },
    select: { tmdbId: true },
  })

  return new Set(rows.map((row) => row.tmdbId))
}
