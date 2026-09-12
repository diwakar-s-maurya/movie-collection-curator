import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { normaliseNote, normaliseTags } from '@/lib/annotation'
import {
  type AnnotationPatch,
  type CollectionMovie,
  type CollectionMoviePage,
  client,
  orpc,
} from '@/lib/orpc'

/** The row as the patch leaves it, normalised the way the API normalises what
 * it stores, so the optimistic copy is the copy that was written. */
function patched(
  movie: CollectionMovie,
  patch: AnnotationPatch,
): CollectionMovie {
  return {
    ...movie,
    ...(patch.note !== undefined && { note: normaliseNote(patch.note) }),
    ...(patch.tags !== undefined && { tags: normaliseTags(patch.tags) }),
    ...(patch.rating !== undefined && { rating: patch.rating }),
  }
}

/**
 * The one write to an annotation, for both of the places that make one: a star
 * clicked on a card and a save from the editor are the same row and the same
 * procedure.
 *
 * It writes optimistically — rating is the highest-frequency action in the app,
 * and a star that waits for a round trip to fill feels broken. The patch goes
 * into every cached page of this collection under a partial key, so the row is
 * found without knowing which page holds it, and stands as the new value on
 * success: the procedure answers `ok` rather than sending the row back.
 *
 * Nothing refetches the grid for a one-field change. What goes stale is the
 * arithmetic over it, so both collection queries are invalidated.
 */
export function useUpdateAnnotation(collectionId: string) {
  const queryClient = useQueryClient()
  const pages = {
    queryKey: orpc.collectionMovies.list.key({ input: { collectionId } }),
  }

  return useMutation({
    mutationKey: orpc.collectionMovies.updateAnnotation.key(),
    // The client directly rather than `mutationOptions`, so a caller sends the
    // patch and not the collection it already opened.
    mutationFn: (patch: AnnotationPatch & { tmdbId: number }) =>
      client.collectionMovies.updateAnnotation({ collectionId, ...patch }),

    onMutate: async ({ tmdbId, ...patch }) => {
      // A refetch already in flight would land after the patch and undo it.
      await queryClient.cancelQueries(pages)

      const previous = queryClient.getQueriesData<CollectionMoviePage>(pages)

      queryClient.setQueriesData<CollectionMoviePage>(
        pages,
        (page) =>
          page && {
            ...page,
            results: page.results.map((movie) =>
              movie.tmdbId === tmdbId ? patched(movie, patch) : movie,
            ),
          },
      )

      return previous
    },

    // Rolled back visibly and said out loud: silently returning a star to
    // where it was is worse than the error.
    onError: (error: Error, _patch, previous) => {
      for (const [key, page] of previous ?? []) {
        queryClient.setQueryData(key, page)
      }
      toast.error(error.message)
    },

    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: orpc.collections.key() }),
  })
}
