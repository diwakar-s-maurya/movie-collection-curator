import type { ApiClient } from '@curator/api/router'
import { createORPCClient, ORPCError } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'

/** `fetch` has no deadline of its own, so a request the server accepts and
 * never answers leaves a query spinning and a write sitting on "Saving…". */
const REQUEST_TIMEOUT_MS = 20_000

/**
 * Same-origin, so the session cookie rides along with no `credentials` setting
 * and the API needs no CORS: in dev, Vite proxies `/api` to the API and strips
 * the prefix (`vite.config.ts`); in a build, whatever serves the SPA does the
 * same.
 */
const link = new RPCLink({
  url: `${window.location.origin}/api/rpc`,
  fetch: async (request, init) => {
    try {
      // Combined with the request's own signal rather than replacing it: that
      // signal is how TanStack cancels, and dropping it would leave
      // superseded requests running.
      return await fetch(request, {
        ...init,
        signal: AbortSignal.any([
          request.signal,
          AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        ]),
      })
    } catch (cause) {
      // `AbortSignal.timeout` aborts with a DOMException named TimeoutError.
      // Given a code here rather than sniffed for downstream, so it arrives as
      // one of the answers the app already handles: `retry` sees 408 and stops
      // asking, and `errorMessage` passes the sentence through. A plain
      // AbortError is a cancelled query and is rethrown untouched.
      if (cause instanceof Error && cause.name === 'TimeoutError') {
        throw new ORPCError('TIMEOUT', {
          message: 'The server took too long to answer. Try again in a moment.',
        })
      }

      throw cause
    }
  },
})

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

/** One collection with everything its own page shows: the row, the summary
 * and the two breakdowns behind the stats strip. */
export type CollectionDetail = Awaited<
  ReturnType<ApiClient['collections']['get']>
>

/** The numbers on that page: the summary plus the two breakdowns. */
export type CollectionStats = CollectionDetail['stats']

/** One page of the movie grid. The annotation hook patches rows into cached
 * pages, so it needs the page's shape and not only the row's. */
export type CollectionMoviePage = Awaited<
  ReturnType<ApiClient['collectionMovies']['list']>
>

/** One film in the open collection: TMDB's snapshot and the user's annotation
 * on the same row. */
export type CollectionMovie = CollectionMoviePage['results'][number]

/** What one write to an annotation may set: the fields, without the pair of
 * ids that say which row they land on. */
export type AnnotationPatch = Omit<
  Parameters<ApiClient['collectionMovies']['updateAnnotation']>[0],
  'collectionId' | 'tmdbId'
>

/** One hit in the search dialog: a film, plus whether the open collection
 * already holds it. */
export type MovieSearchResult = Awaited<
  ReturnType<ApiClient['movies']['search']>
>['results'][number]
