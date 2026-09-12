import { ORPCError } from '@orpc/client'
import type { QueryClient } from '@tanstack/react-query'
import {
  createBrowserHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router'

import { AuthedLayout } from '@/components/layout/authed-layout'
import { RootLayout } from '@/components/layout/root-layout'
import { orpc } from '@/lib/orpc'
import { queryClient } from '@/lib/query-client'
import { pageSearchMiddleware, validatePageSearch } from '@/lib/search'
import { CollectionDetail } from '@/routes/collection-detail'
import { Collections } from '@/routes/collections'
import { NotFound } from '@/routes/not-found'
import { RouteError } from '@/routes/route-error'
import { SignIn } from '@/routes/sign-in'

// Code-based routes: a handful of them do not need the file-based plugin.
// Routes get the query client from context so a loader or guard can prime the
// cache before a component renders.
const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
})

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  component: SignIn,
})

/**
 * The only auth check in the app. Pathless, so every route under it is guarded
 * by being a child and nothing has to remember to ask. `ensureQueryData` means
 * the user is fetched once and then read from the cache by the header and by
 * every later navigation.
 */
const authedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_authed',
  beforeLoad: async ({ context }) => {
    try {
      const user = await context.queryClient.ensureQueryData(
        orpc.auth.me.queryOptions(),
      )

      return { user }
    } catch (error) {
      // Only "you are not signed in" belongs on the sign-in page; anything
      // else goes to the error boundary rather than being read as a sign-out.
      if (error instanceof ORPCError && error.code === 'UNAUTHORIZED') {
        throw redirect({ to: '/sign-in' })
      }

      throw error
    }
  },
  component: AuthedLayout,
})

const collectionsRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/',
  // Paged like the movie grid, since each card's numbers aggregate that
  // collection's memberships.
  validateSearch: validatePageSearch,
  search: { middlewares: pageSearchMiddleware },
  component: Collections,
})

const collectionDetailRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/collections/$collectionId',
  validateSearch: validatePageSearch,
  search: { middlewares: pageSearchMiddleware },
  component: CollectionDetail,
})

const routeTree = rootRoute.addChildren([
  signInRoute,
  authedRoute.addChildren([collectionsRoute, collectionDetailRoute]),
])

export const router = createRouter({
  routeTree,
  // Browser history, not memory: real URLs make a refresh land where you were
  // and a collection linkable.
  history: createBrowserHistory(),
  context: { queryClient },
  defaultNotFoundComponent: NotFound,
  // Every route's error boundary, including the guard's, so a failure with
  // nothing left to show gets a screen in the app's own language.
  defaultErrorComponent: RouteError,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
