import type { ApiClient } from '@curator/api/router'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'

/**
 * Same-origin, so the session cookie rides along with no `credentials` setting
 * and the API needs no CORS: in dev, Vite proxies `/api` to the API and strips
 * the prefix (`vite.config.ts`); in a build, whatever serves the SPA does the
 * same.
 */
const link = new RPCLink({ url: `${window.location.origin}/api/rpc` })

/**
 * The whole API, typed from the server's router with no codegen step. The
 * import is type-only, so none of the server reaches the bundle.
 */
export const client = createORPCClient<ApiClient>(link)

/** Query keys, `queryOptions` and `mutationOptions` per procedure. */
export const orpc = createTanstackQueryUtils(client)

/** The signed-in user, read off the client rather than restated here: the
 * API's `user` schema stays the only definition of the shape. */
export type User = Awaited<ReturnType<ApiClient['auth']['me']>>

/** One collection as the list view sees it: the row plus the summary stats
 * behind its card. */
export type CollectionSummary = Awaited<
  ReturnType<ApiClient['collections']['list']>
>['results'][number]

/**
 * One film in the open collection: TMDB's snapshot and the user's annotation
 * on the same row, as the grid and the annotation sheet both read it.
 */
export type CollectionMovie = Awaited<
  ReturnType<ApiClient['collectionMovies']['list']>
>['results'][number]

/** One hit in the search dialog: a film, plus whether the open collection
 * already holds it. */
export type MovieSearchResult = Awaited<
  ReturnType<ApiClient['movies']['search']>
>['results'][number]
