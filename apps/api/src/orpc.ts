import { type TmdbClient, TmdbError, type TmdbErrorCode } from '@curator/tmdb'
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
  ResponseHeadersPluginContext & { tmdb: TmdbClient }

/**
 * A procedure anyone can call: sign-in and sign-out, and nothing else. Every
 * procedure is built from this one, so the TMDB boundary covers the whole
 * router rather than only today's TMDB callers.
 */
export const pub = os.$context<ApiContext>().use(async ({ next }) => {
  try {
    return await next()
  } catch (error) {
    if (!(error instanceof TmdbError)) throw error

    throw toApiError(error)
  }
})

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

/** What a caller is told when TMDB failed. Every code but `NOT_FOUND` is a
 * `BAD_GATEWAY`; the message says whether waiting will help. */
const BAD_GATEWAY_MESSAGE: Record<
  Exclude<TmdbErrorCode, 'NOT_FOUND'>,
  string
> = {
  RATE_LIMITED: 'TMDB is rate-limiting this app. Try again in a moment.',
  UPSTREAM: 'Could not reach TMDB. Try again in a moment.',
  UNAUTHORIZED: 'Movie data is unavailable: TMDB rejected this app’s token.',
  INVALID_RESPONSE:
    'Movie data is unavailable: TMDB answered in an unexpected shape.',
}

/**
 * The one place a `TmdbError` becomes an HTTP answer. An id TMDB does not have
 * is the caller's `NOT_FOUND`; a rejected token or a changed response shape is
 * our bug and is logged as an error, since both need a code or config change
 * rather than a retry.
 */
function toApiError(error: TmdbError): ORPCError<string, unknown> {
  if (error.code === 'NOT_FOUND') {
    return new ORPCError('NOT_FOUND', {
      message: 'TMDB has no movie with that id.',
      cause: error,
    })
  }

  const ours =
    error.code === 'UNAUTHORIZED' || error.code === 'INVALID_RESPONSE'
  ;(ours ? console.error : console.warn)(`[tmdb] ${error.message}`)

  return new ORPCError('BAD_GATEWAY', {
    message: BAD_GATEWAY_MESSAGE[error.code],
    cause: error,
  })
}
