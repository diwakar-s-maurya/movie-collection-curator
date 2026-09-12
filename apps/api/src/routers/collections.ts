import { ORPCError } from '@orpc/server'

import { authed } from '../orpc.js'
import {
  collection,
  collectionIdInput,
  collectionPage,
  collectionsListInput,
  createCollectionInput,
} from '../schemas/collections.js'
import { ok } from '../schemas/common.js'
import * as collectionsService from '../services/collections.js'

/** What a collection the signed-in user does not own looks like from outside. */
function notFound() {
  return new ORPCError('NOT_FOUND', { message: 'No such collection.' })
}

export const collectionsRouter = {
  list: authed
    .route({
      method: 'GET',
      path: '/collections',
      summary: "One page of the signed-in user's collections, newest first",
    })
    .input(collectionsListInput)
    .output(collectionPage)
    .handler(({ input, context }) =>
      collectionsService.listCollections(context.user.id, input),
    ),

  get: authed
    .route({
      method: 'GET',
      path: '/collections/{id}',
      summary: 'One collection',
    })
    .input(collectionIdInput)
    .output(collection)
    .handler(async ({ input, context }) => {
      const found = await collectionsService.findCollection(
        context.user.id,
        input.id,
      )
      if (!found) throw notFound()

      return found
    }),

  create: authed
    .route({
      method: 'POST',
      path: '/collections',
      summary: 'Create a collection',
      successStatus: 201,
    })
    .input(createCollectionInput)
    .output(collection)
    .handler(({ input, context }) =>
      collectionsService.createCollection(context.user.id, input),
    ),

  delete: authed
    .route({
      method: 'DELETE',
      path: '/collections/{id}',
      summary: 'Delete a collection and everything in it',
    })
    .input(collectionIdInput)
    .output(ok)
    .handler(async ({ input, context }) => {
      const deleted = await collectionsService.deleteCollection(
        context.user.id,
        input.id,
      )
      if (!deleted) throw notFound()

      return { ok: true } as const
    }),
}
