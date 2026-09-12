import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { normaliseNote, normaliseTags } from '@/lib/annotation'
import { errorMessage } from '@/lib/error-message'
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

/** The row's own values for exactly the fields this patch carries: the patch
 * that puts back what it is about to overwrite. Read off the keys rather than
 * listed again, so a fourth field is `patched`'s business alone. */
function undoOf(
  movie: CollectionMovie,
  patch: AnnotationPatch,
): AnnotationPatch {
  return Object.fromEntries(
    Object.keys(patch).map((field) => [
      field,
      movie[field as keyof AnnotationPatch],
    ]),
  )
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
 *
 * Writes overlap — a star is clicked while a note is saving — so a failure
 * undoes its own fields rather than restoring the page it found, which would
 * take a write that succeeded in between down with it. The undo is what the
 * eye needs; the refetch beside it is what settles two writes to one field.
 */
export function useUpdateAnnotation(collectionId: string) {
  const queryClient = useQueryClient()
  const pages = {
    queryKey: orpc.collectionMovies.list.key({ input: { collectionId } }),
  }

  /** One row, wherever it is cached: the grid's pages are keyed by page
   * number, and the dialog reads the row back out of them. */
  const patchRow = (tmdbId: number, patch: AnnotationPatch) =>
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

  return useMutation({
    mutationKey: orpc.collectionMovies.updateAnnotation.key(),
    // The client directly rather than `mutationOptions`, so a caller sends the
    // patch and not the collection it already opened.
    mutationFn: (patch: AnnotationPatch & { tmdbId: number }) =>
      client.collectionMovies.updateAnnotation({ collectionId, ...patch }),

    onMutate: async ({ tmdbId, ...patch }) => {
      // A refetch already in flight would land after the patch and undo it.
      await queryClient.cancelQueries(pages)

      // Read before the patch, and only the fields the patch touches.
      const row = queryClient
        .getQueriesData<CollectionMoviePage>(pages)
        .flatMap(([, page]) => page?.results ?? [])
        .find((movie) => movie.tmdbId === tmdbId)

      patchRow(tmdbId, patch)

      return row && undoOf(row, patch)
    },

    // Rolled back visibly and said out loud: silently returning a star to
    // where it was is worse than the error.
    onError: (error: Error, { tmdbId }, undo) => {
      if (undo) patchRow(tmdbId, undo)
      // Two writes to the same field can still disagree about what the undo
      // should have put back, and only the server knows how they landed.
      // Failures are rare enough to pay a refetch for.
      void queryClient.invalidateQueries(pages)
      toast.error(errorMessage(error))
    },

    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: orpc.collections.key() }),
  })
}
