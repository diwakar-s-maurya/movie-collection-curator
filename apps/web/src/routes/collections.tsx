import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { type ReactNode, useRef, useState } from 'react'
import { toast } from 'sonner'

import { CollectionCard } from '@/components/collection-card'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CreateCollectionForm } from '@/components/create-collection-form'
import { PageHeading } from '@/components/page-heading'
import { Pagination } from '@/components/pagination'
import { RetryableError } from '@/components/retryable-error'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '@/lib/error-message'
import { type CollectionSummary, orpc } from '@/lib/orpc'
import { pageAfterRemoval } from '@/lib/search'

const SKELETON_CARDS = [0, 1, 2, 3]

const Collections = () => {
  const { page } = useSearch({ from: '/_authed/' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [pendingDelete, setPendingDelete] = useState<CollectionSummary | null>(
    null,
  )
  const [composing, setComposing] = useState(false)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const composeButtonRef = useRef<HTMLButtonElement>(null)

  const collections = useQuery(
    orpc.collections.list.queryOptions({
      input: { page },
      // Without this the grid empties out and the page height jumps on every
      // click while the next page loads.
      placeholderData: keepPreviousData,
    }),
  )

  /**
   * What both writes do afterwards, in one place: a partial key, so every
   * cached page of the list goes stale — writes push rows across page
   * boundaries. Only the page on screen refetches now, and when the write also
   * moves the user, that page's own mount is the fetch.
   */
  const settleList = (targetPage: number) => {
    const moving = targetPage !== page

    void queryClient.invalidateQueries({
      queryKey: orpc.collections.list.key(),
      refetchType: moving ? 'none' : 'active',
    })
    if (moving) void navigate({ to: '/', search: { page: targetPage } })
  }

  // The card that replaced the composer takes the focus as it arrives, so the
  // user stands on what they just made. Consumed here rather than left set, or
  // paging back to this card later would steal the focus again.
  const focusCreated = (link: HTMLAnchorElement | null) => {
    if (!link) return

    link.focus()
    setCreatedId(null)
  }

  const create = useMutation(
    orpc.collections.create.mutationOptions({
      // Not awaited: a promise returned from `onSuccess` keeps the mutation
      // pending, holding the form disabled for a second round trip.
      onSuccess: (collection) => {
        setComposing(false)
        // No toast: the card landing in the composer's slot is the confirmation.
        setCreatedId(collection.id)

        // Newest first, so a collection created from page 2 would otherwise
        // land on page 1, out of sight.
        settleList(1)
      },
    }),
  )

  const remove = useMutation(
    orpc.collections.delete.mutationOptions({
      onSuccess: () => {
        setPendingDelete(null)
        settleList(pageAfterRemoval(collections.data?.results.length, page))
      },
      // The dialog stays open on failure: the row is still there, so a toast
      // is what says why.
      onError: (error) => toast.error(errorMessage(error)),
    }),
  )

  const closeComposer = () => {
    setComposing(false)
    // Back to the control it came from: focus would otherwise land on the body
    // and a keyboard user would start the page again from the top.
    composeButtonRef.current?.focus()
  }

  /**
   * Which create affordance belongs on the page depends on whether there are
   * collections, so neither is shown until the list has answered. A failed list
   * still gets the button: creating is a fair thing to attempt when the list is
   * what broke.
   */
  const isEmpty = collections.data?.totalResults === 0
  const showComposeButton = !collections.isPending && !isEmpty

  let body: ReactNode

  if (collections.isPending) {
    body = (
      <div className="grid gap-4 sm:grid-cols-2">
        {SKELETON_CARDS.map((key) => (
          <Skeleton key={key} className="h-28 rounded-xl" />
        ))}
      </div>
    )
  } else if (collections.isError) {
    body = (
      <RetryableError
        error={collections.error}
        onRetry={() => void collections.refetch()}
      />
    )
  } else if (isEmpty) {
    // The form is the empty state: the one thing to do is already open, rather
    // than a paragraph above a form saying the same thing.
    body = (
      <CreateCollectionForm
        variant="first"
        onCreate={create.mutate}
        pending={create.isPending}
        error={create.error}
      />
    )
  } else {
    body = (
      <>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* In the grid, not above it: the composer is the size and shape of
              a card and sits where the new one will land. */}
          {composing ? (
            <CreateCollectionForm
              variant="composer"
              onCreate={create.mutate}
              pending={create.isPending}
              error={create.error}
              onCancel={closeComposer}
            />
          ) : null}
          {collections.data.results.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              linkRef={collection.id === createdId ? focusCreated : undefined}
              onDelete={() => setPendingDelete(collection)}
            />
          ))}
        </div>
        {/* The page the router holds, not the one the response echoes: with
            `keepPreviousData` the response still describes the old page while
            the new one loads. */}
        <Pagination
          page={page}
          totalPages={collections.data.totalPages}
          onPage={(next) => void navigate({ to: '/', search: { page: next } })}
        />
      </>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeading>Collections</PageHeading>
        {showComposeButton ? (
          <Button
            ref={composeButtonRef}
            aria-expanded={composing}
            onClick={() => (composing ? closeComposer() : setComposing(true))}
          >
            <Plus />
            New collection
          </Button>
        ) : null}
      </div>

      {body}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title="Delete this collection?"
        description={
          <>
            <strong className="text-foreground">{pendingDelete?.name}</strong>{' '}
            and every note, tag and rating in it are deleted. This cannot be
            undone.
          </>
        }
        confirmLabel="Delete"
        pending={remove.isPending}
        onConfirm={() => {
          if (pendingDelete) remove.mutate({ id: pendingDelete.id })
        }}
      />
    </div>
  )
}

export { Collections }
