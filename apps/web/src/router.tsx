import type { QueryClient } from '@tanstack/react-query'
import {
  createBrowserHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
} from '@tanstack/react-router'

import { RootLayout } from '@/components/layout/root-layout'
import { queryClient } from '@/lib/query-client'
import { Collections } from '@/routes/collections'

// Code-based routes: a handful of them do not need the file-based plugin.
// Routes get the query client from context so a loader or guard can prime the
// cache before a component renders.
const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
})

const collectionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Collections,
})

const routeTree = rootRoute.addChildren([collectionsRoute])

export const router = createRouter({
  routeTree,
  // Browser history, not memory: real URLs make a refresh land where you were
  // and a collection linkable.
  history: createBrowserHistory(),
  context: { queryClient },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
