import { authRouter } from './auth.js'

/** The whole API. The SPA infers its client from this type, with no codegen. */
export const router = {
  auth: authRouter,
}

export type ApiRouter = typeof router
