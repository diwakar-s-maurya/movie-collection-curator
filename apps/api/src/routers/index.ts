import { authRouter } from './auth.js'
import { collectionMoviesRouter } from './collection-movies.js'
import { collectionsRouter } from './collections.js'
import { moviesRouter } from './movies.js'

/** The whole API. The SPA infers its client from this type, with no codegen. */
export const router = {
  auth: authRouter,
  collections: collectionsRouter,
  collectionMovies: collectionMoviesRouter,
  movies: moviesRouter,
}

export type ApiRouter = typeof router
