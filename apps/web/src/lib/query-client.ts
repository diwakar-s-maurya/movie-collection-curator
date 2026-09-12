import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    // Default staleTime is 0, so a route loader that primes the cache is
    // immediately refetched by the component that mounts after it. Half a
    // minute leaves a mutation's invalidation as what refreshes a view.
    queries: { staleTime: 30_000 },
  },
})
