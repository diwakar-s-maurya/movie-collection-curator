import type {
  MovieDetails,
  MovieSearchPage,
  MovieSummary,
  TmdbClient,
} from '@curator/tmdb'
import { type Mock, vi } from 'vitest'

import { signIn } from '../services/auth.js'
import { createCollection } from '../services/collections.js'

/** The films every service suite adds and searches for. Details rather than
 * summaries, since search hits are these minus what TMDB does not send. */
export const heat: MovieDetails = {
  tmdbId: 949,
  title: 'Heat',
  overview: 'A crew of high-end thieves.',
  posterPath: '/umSVjVdbVwtx5ryCA2QXL44Durm.jpg',
  releaseDate: '1995-12-15',
  runtime: 170,
  genres: [
    { id: 28, name: 'Action' },
    { id: 80, name: 'Crime' },
  ],
  voteAverage: 7.9,
}

export const scarface: MovieDetails = {
  ...heat,
  tmdbId: 111,
  title: 'Scarface',
  runtime: 170,
}

/** The client with every method still a spy, so a test can assert what did
 * and did not reach upstream. */
type FakeTmdbClient = { [K in keyof TmdbClient]: Mock<TmdbClient[K]> }

/**
 * TMDB answered from memory, and counting its calls, so a test can assert that
 * a second add does not reach upstream. Search returns the catalogue as hits,
 * dropping exactly what TMDB's search endpoint does not send.
 */
export function fakeTmdb(
  catalogue: MovieDetails[] = [heat, scarface],
): FakeTmdbClient {
  const results: MovieSummary[] = catalogue.map(
    ({ runtime: _runtime, genres: _genres, ...summary }) => summary,
  )
  const page: MovieSearchPage = {
    page: 1,
    totalPages: 1,
    totalResults: results.length,
    results,
  }

  return {
    searchMovies: vi.fn(async () => page),
    getMovie: vi.fn(async (tmdbId) => {
      const found = catalogue.find((movie) => movie.tmdbId === tmdbId)
      if (!found) throw new Error(`no fixture for tmdb id ${tmdbId}`)

      return found
    }),
    verifyAccessToken: vi.fn(),
  }
}

/** One signed-in user with one empty collection: the start of every case that
 * is about what happens inside a collection. */
export async function ownerWithCollection(name: string) {
  const user = await signIn(name)
  const collection = await createCollection(user.id, {
    name: 'Noir',
    description: null,
  })

  return { user, collection }
}
