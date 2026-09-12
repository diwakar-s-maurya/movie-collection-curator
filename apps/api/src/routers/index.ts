import type { RouterClient } from '@orpc/server'

import { authRouter } from './auth.js'

/** The whole API. */
export const router = {
  auth: authRouter,
}

export type ApiRouter = typeof router

/**
 * What the SPA's oRPC client is, with no codegen: every procedure as a typed
 * method, its argument the procedure's input schema and its result the output
 * one. Declared here rather than derived in the web app, so the API owns the
 * shape of its own client and the browser imports a type and nothing else.
 */
export type ApiClient = RouterClient<ApiRouter>
