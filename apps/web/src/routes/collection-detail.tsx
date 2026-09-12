import { ORPCError } from '@orpc/client'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { ErrorText } from '@/components/error-text'
import { MovieCard } from '@/components/movie-card'
import { PageHeading } from '@/components/page-heading'
import { Pagination } from '@/components/pagination'
import { RetryableError } from '@/components/retryable-error'
import { SearchDialog } from '@/components/search-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { type CollectionMovie, orpc } from '@/lib/orpc'
import { pageAfterRemoval } from '@/lib/search'
import { NotFoundPanel } from '@/routes/not-found'

const ROUTE = '/_authed/collections/$collectionId'
const SKELETON_CARDS = [0, 1, 2, 3, 4, 5, 6, 7]
// One definition, so the skeletons keep the shape of the grid they stand in for.
const GRID = 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'

/**
 * The workbench: everything about one collection on one screen. Search is a
 * dialog over this view and the annotation editor a sheet beside it, so the
 * only navigation in the app is list → collection → back.
 */
const CollectionDetail = () => {
  const { collectionId } = useParams({ from: ROUTE })
  const { page } = useSearch({ from: ROUTE })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchOpen, setSearchOpen] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<CollectionMovie | null>(
    null,
  )

  // Two queries, because they answer at different rates: every write touches
  // the stats, while the grid changes only on paging.
  const collection = useQuery(
    orpc.collections.get.queryOptions({ input: { id: collectionId } }),
  )
  const movies = useQuery(
    orpc.collectionMovies.list.queryOptions({
      input: { collectionId, page },
      // Without this the grid collapses to nothing and the page jumps under
      // the click while the next page loads.
      placeholderData: keepPreviousData,
    }),
  )

  const goToPage = (next: number) =>
    void navigate({
      to: '/collections/$collectionId',
      params: { collectionId },
      search: { page: next },
    })

  /**
   * What adding or removing a film makes stale, in one place: this page of the
   * grid, the stats above it, the card on the list view, and the cached
   * searches whose `inCollection` flags predate the change. Every key is
   * partial, so off-screen pages refetch when next looked at rather than now.
   */
  const settleMembership = (targetPage: number) => {
    const moving = targetPage !== page

    void queryClient.invalidateQueries({
      queryKey: orpc.collectionMovies.list.key({ input: { collectionId } }),
      // When the write also moves the user, that page's mount is the fetch.
      refetchType: moving ? 'none' : 'active',
    })
    // `get` behind the stats and `list` behind the card on the other view.
    void queryClient.invalidateQueries({ queryKey: orpc.collections.key() })
    void queryClient.invalidateQueries({
      queryKey: orpc.movies.search.key({ input: { collectionId } }),
      // The flags only have to be right the next time the dialog opens; no
      // point refetching TMDB for a panel that is closing.
      refetchType: 'none',
    })

    if (moving) goToPage(targetPage)
  }

  const remove = useMutation(
    orpc.collectionMovies.remove.mutationOptions({
      onSuccess: () => {
        setPendingRemove(null)
        settleMembership(pageAfterRemoval(movies.data?.results.length, page))
      },
      // The dialog stays open on failure: the card is still in the grid, and
      // the obvious reading of a closed dialog is that the film went.
      onError: (error) => toast.error(error.message),
    }),
  )

  // A collection that was deleted in another tab, or a link that has gone
  // stale. A normal outcome with a normal screen, not an error boundary.
  if (
    collection.error instanceof ORPCError &&
    collection.error.code === 'NOT_FOUND'
  ) {
    return (
      <NotFoundPanel
        title="This collection isn't here any more."
        description="It may have been deleted from another tab, or the link may be out of date."
      />
    )
  }

  const addFilmsButton = collection.data ? (
    <Button onClick={() => setSearchOpen(true)}>
      <Plus />
      Add films
    </Button>
  ) : null
  // An empty collection's one instruction owns the call to action, so the
  // heading does not offer the same button a second time.
  const isEmpty = movies.data?.totalResults === 0

  let grid: ReactNode

  if (movies.isPending) {
    grid = (
      <div className={GRID}>
        {SKELETON_CARDS.map((key) => (
          <Skeleton key={key} className="aspect-2/3 rounded-xl" />
        ))}
      </div>
    )
  } else if (movies.isError) {
    grid = (
      <RetryableError
        error={movies.error}
        onRetry={() => void movies.refetch()}
      />
    )
  } else if (isEmpty) {
    grid = (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
        {addFilmsButton}
      </div>
    )
  } else {
    grid = (
      <>
        <div className={GRID}>
          {movies.data.results.map((movie) => (
            <MovieCard
              key={movie.tmdbId}
              movie={movie}
              onRemove={() => setPendingRemove(movie)}
            />
          ))}
        </div>
        {/* The page the router holds, not the one the response echoes: with
            `keepPreviousData` the response still describes the previous page
            while the next loads. */}
        <Pagination
          page={page}
          totalPages={movies.data.totalPages}
          onPage={goToPage}
        />
      </>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        {collection.data ? (
          <div className="flex flex-col gap-1">
            <PageHeading>{collection.data.name}</PageHeading>
            {collection.data.description ? (
              <p className="text-sm text-muted-foreground">
                {collection.data.description}
              </p>
            ) : null}
          </div>
        ) : (
          // The name is the page's title; nothing honest to show until it lands.
          <Skeleton className="h-9 w-64" />
        )}
        {isEmpty ? null : addFilmsButton}
      </div>

      {/* The collection failing to load does not stop the grid: the films are
          a separate query and still worth showing. */}
      {collection.isError ? <ErrorText error={collection.error} /> : null}

      {grid}

      {collection.data ? (
        <SearchDialog
          collectionId={collectionId}
          collectionName={collection.data.name}
          open={searchOpen}
          onOpenChange={setSearchOpen}
          // Adding from page 2 leaves the user where they are: the new film
          // lands on page 1, but a page that jumps out from under a just-closed
          // dialog is worse than one film out of sight.
          onAdded={() => settleMembership(page)}
        />
      ) : null}

      <ConfirmDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null)
        }}
        title="Remove this film?"
        description={
          <>
            <strong className="text-foreground">{pendingRemove?.title}</strong>{' '}
            leaves this collection, and the note, tags and rating on it go with
            it.
          </>
        }
        confirmLabel="Remove"
        pending={remove.isPending}
        onConfirm={() => {
          if (pendingRemove) {
            remove.mutate({ collectionId, tmdbId: pendingRemove.tmdbId })
          }
        }}
      />
    </div>
  )
}

export { CollectionDetail }
