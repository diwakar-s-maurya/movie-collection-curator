import { ORPCError, os } from '@orpc/server'
import type {
  RequestHeadersPluginContext,
  ResponseHeadersPluginContext,
} from '@orpc/server/plugins'

import { findUser } from './services/auth.js'
import { readUserId } from './session.js'

/**
 * What every procedure is handed. The header pairs come from the two plugins
 * `api.ts` registers, so sign-in sets a cookie and the middleware below reads
 * one without the router knowing it is served by Express.
 */
export type ApiContext = RequestHeadersPluginContext &
  ResponseHeadersPluginContext

/** A procedure anyone can call: sign-in and sign-out, and nothing else. */
export const pub = os.$context<ApiContext>()

/**
 * A procedure that needs a signed-in user, and the single place a cookie
 * becomes one. Everything downstream reads `context.user` and never the cookie,
 * so putting real auth here later changes nothing else (README decision 7).
 */
export const authed = pub.use(async ({ context, next }) => {
  const id = readUserId(context.reqHeaders)
  const user = id ? await findUser(id) : null

  if (!user) {
    throw new ORPCError('UNAUTHORIZED', { message: 'Sign in to continue.' })
  }

  return next({ context: { user } })
})
