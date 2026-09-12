import { ORPCError } from '@orpc/server'

import { authed } from '../orpc.js'
import {
  collectionMovie,
  collectionMovieInput,
  collectionMoviePage,
  collectionMoviesListInput,
  updateAnnotationInput,
} from '../schemas/collection-movies.js'
import { ok } from '../schemas/common.js'
import * as service from '../services/collection-movies.js'
import { noSuchCollection } from './collections.js'

/** One answer for a collection that is not the caller's and a movie that was
 * never in it: as far as they are concerned, neither exists. */
function noSuchMovie() {
  return new ORPCError('NOT_FOUND', {
    message: 'That movie is not in the collection.',
  })
}

export const collectionMoviesRouter = {
  list: authed
    .route({
      method: 'GET',
      path: '/collections/{collectionId}/movies',
      summary: "One page of a collection's movies, newest first",
    })
    .input(collectionMoviesListInput)
    .output(collectionMoviePage)
    .handler(async ({ input, context }) => {
      const page = await service.listCollectionMovies(context.user.id, input)
      if (!page) throw noSuchCollection()

      return page
    }),

  add: authed
    .route({
      method: 'POST',
      // No 201: add is idempotent, so the answer is the row the movie is on,
      // which may be the row it was already on.
      path: '/collections/{collectionId}/movies',
      summary: 'Add a movie, caching what TMDB says about it',
    })
    .input(collectionMovieInput)
    .output(collectionMovie)
    .handler(async ({ input, context }) => {
      const added = await service.addMovie(context.tmdb, context.user.id, input)
      if (!added) throw noSuchCollection()

      return added
    }),

  remove: authed
    .route({
      method: 'DELETE',
      path: '/collections/{collectionId}/movies/{tmdbId}',
      summary: 'Remove a movie from a collection, annotation and all',
    })
    .input(collectionMovieInput)
    .output(ok)
    .handler(async ({ input, context }) => {
      const removed = await service.removeMovie(context.user.id, input)
      if (!removed) throw noSuchMovie()

      return { ok: true } as const
    }),

  updateAnnotation: authed
    .route({
      method: 'PATCH',
      path: '/collections/{collectionId}/movies/{tmdbId}/annotation',
      summary: 'Set the note, tags or rating on a movie in a collection',
    })
    .input(updateAnnotationInput)
    .output(ok)
    .handler(async ({ input, context }) => {
      const updated = await service.updateAnnotation(context.user.id, input)
      if (!updated) throw noSuchMovie()

      return { ok: true } as const
    }),
}
