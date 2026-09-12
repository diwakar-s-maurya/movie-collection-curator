import { ORPCError } from '@orpc/client'
import { QueryClient } from '@tanstack/react-query'

/**
 * Retry what looks like bad luck, not what the server decided. A 4xx is an
 * answer, and asking again only delays showing it; anything else gets two more
 * goes.
 */
function retry(failureCount: number, error: Error): boolean {
  if (error instanceof ORPCError && error.status < 500) return false

  return failureCount < 2
}

export const queryClient = new QueryClient({
  defaultOptions: {
    // Default staleTime is 0, so a route loader that primes the cache is
    // immediately refetched by the component that mounts after it. Half a
    // minute leaves a mutation's invalidation as what refreshes a view.
    queries: { staleTime: 30_000, retry },
  },
})
