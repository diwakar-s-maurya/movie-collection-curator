import { authRouter } from './auth.js'
import { collectionsRouter } from './collections.js'

/** The whole API. The SPA infers its client from this type, with no codegen. */
export const router = {
  auth: authRouter,
  collections: collectionsRouter,
}

export type ApiRouter = typeof router
