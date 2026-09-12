import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, Plus } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { toast } from 'sonner'

import { Poster } from '@/components/poster'
import { RetryableError } from '@/components/retryable-error'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { releaseYear } from '@/lib/format'
import { type MovieSearchResult, orpc } from '@/lib/orpc'
import { useDebouncedValue } from '@/lib/use-debounced-value'

// The API's own minimum, restated so the dialog can say so rather than send a
// request it already knows will be rejected.
const QUERY_MIN_LENGTH = 2
const DEBOUNCE_MS = 300
const SKELETON_ROWS = [0, 1, 2]

type SearchDialogProps = {
  collectionId: string
  collectionName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Told once, when the dialog closes having added anything: the grid and the
   * stats behind it are out of date by then. */
  onAdded: () => void
}

/**
 * Searching is something you do *to* the open collection, so it is a dialog
 * over the detail view rather than a route of its own: the collection stays on
 * screen behind it and its name is in the title.
 *
 * It stays open after an add — the button becomes "Added" — so a handful of
 * films is one search rather than one search each.
 */
const SearchDialog = ({
  collectionId,
  collectionName,
  open,
  onOpenChange,
  onAdded,
}: SearchDialogProps) => {
  const [term, setTerm] = useState('')
  const debounced = useDebouncedValue(term, DEBOUNCE_MS)
  /**
   * What was added while this dialog was open. `inCollection` on a cached
   * result is whatever was true when it was fetched, so this is what lets a
   * just-added row say "Added" without re-running the search.
   */
  const [added, setAdded] = useState<ReadonlySet<number>>(new Set())

  const query = debounced.trim()
  const longEnough = query.length >= QUERY_MIN_LENGTH

  // The debounced term is the key, so one request fires per pause in the
  // typing. The collection id rides along for `inCollection`, which the client
  // cannot work out itself from a grid that holds one page.
  //
  // `open` is in the condition because the dialog outlives its overlay while it
  // animates out, and an enabled query behind it is one TMDB request per focus.
  const results = useQuery(
    orpc.movies.search.queryOptions({
      input: { query, collectionId },
      enabled: open && longEnough,
    }),
  )

  const add = useMutation(
    orpc.collectionMovies.add.mutationOptions({
      onSuccess: (movie) =>
        setAdded((previous) => new Set(previous).add(movie.tmdbId)),
      // The row is still there and unchanged, so a toast is the whole report.
      onError: (error) => toast.error(error.message),
    }),
  )

  const onDialogOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (nextOpen) return

    // Deferred to the close rather than run per add: refetching the grid under
    // the overlay is work nobody can see.
    if (added.size > 0) onAdded()
    setAdded(new Set())
  }

  let body: ReactNode

  if (!longEnough) {
    body = (
      <p className="text-sm text-muted-foreground">
        Type at least {QUERY_MIN_LENGTH} characters to search TMDB.
      </p>
    )
  } else if (results.isPending) {
    body = (
      <ul className="flex flex-col gap-4">
        {SKELETON_ROWS.map((key) => (
          <li key={key} className="flex gap-3">
            <Skeleton className="aspect-2/3 w-14 shrink-0 rounded-md" />
            <div className="flex flex-1 flex-col gap-2 py-1">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </li>
        ))}
      </ul>
    )
  } else if (results.isError) {
    // Worth retrying by hand rather than only on the next keystroke: TMDB was
    // unreachable a second ago and may not be now.
    body = (
      <RetryableError
        error={results.error}
        onRetry={() => void results.refetch()}
      />
    )
  } else if (results.data.results.length === 0) {
    body = (
      <p className="text-sm text-muted-foreground">
        No films match <span className="text-foreground">{query}</span>.
      </p>
    )
  } else {
    body = (
      <ul className="flex flex-col gap-4">
        {results.data.results.map((result) => (
          <SearchResultRow
            key={result.tmdbId}
            result={result}
            added={result.inCollection || added.has(result.tmdbId)}
            pending={add.isPending && add.variables.tmdbId === result.tmdbId}
            onAdd={() => add.mutate({ collectionId, tmdbId: result.tmdbId })}
          />
        ))}
      </ul>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onDialogOpenChange}>
      {/* Full screen on a phone: a modal with a margin round it wastes the room
          the results need. */}
      <DialogContent className="flex max-h-[85vh] flex-col gap-4 max-sm:h-dvh max-sm:max-h-none max-sm:max-w-none max-sm:rounded-none sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add films to {collectionName}</DialogTitle>
          <DialogDescription className="sr-only">
            Search TMDB and add films to this collection. The dialog stays open,
            so several can be added at once.
          </DialogDescription>
        </DialogHeader>

        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search TMDB…"
          aria-label="Search films"
          className="h-9"
        />

        {/* Only the results scroll: the field stays put while they move under
            it, so typing never chases the input up the screen. */}
        <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
      </DialogContent>
    </Dialog>
  )
}

type SearchResultRowProps = {
  result: MovieSearchResult
  added: boolean
  pending: boolean
  onAdd: () => void
}

/** One hit: enough to tell two films of the same name apart — poster, year and
 * the first lines of the overview. Anything more needs a second TMDB request. */
const SearchResultRow = ({
  result,
  added,
  pending,
  onAdd,
}: SearchResultRowProps) => {
  const year = releaseYear(result.releaseDate)

  return (
    <li className="flex gap-3">
      <Poster
        url={result.posterUrl}
        title={result.title}
        className="w-14 shrink-0 rounded-md"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <p className="leading-snug font-medium">
            {result.title}
            {year ? (
              <span className="text-muted-foreground"> · {year}</span>
            ) : null}
          </p>
          {added ? (
            // A check as well as the word: a label alone is easy to miss
            // halfway down a list.
            <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
              <Check className="size-4" />
              Added
            </span>
          ) : (
            <Button size="sm" onClick={onAdd} disabled={pending}>
              <Plus />
              {pending ? 'Adding…' : 'Add'}
            </Button>
          )}
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {result.overview}
        </p>
      </div>
    </li>
  )
}

export { SearchDialog }
