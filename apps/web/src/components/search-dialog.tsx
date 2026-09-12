import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { Check, Loader2, Plus } from 'lucide-react'
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
import { errorMessage } from '@/lib/error-message'
import { releaseYear } from '@/lib/format'
import { type MovieSearchResult, orpc } from '@/lib/orpc'
import { useContentHeight } from '@/lib/use-content-height'
import { useDebouncedValue } from '@/lib/use-debounced-value'

// The API's own minimum, restated so the dialog can say so rather than send a
// request it already knows will be rejected.
const QUERY_MIN_LENGTH = 2
const DEBOUNCE_MS = 300

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
  const [bodyRef, bodyHeight] = useContentHeight<HTMLDivElement>()

  // The field and the last request disagree for the length of the debounce,
  // and most of what this dialog shows is a choice between the two.
  const typed = term.trim()
  const query = debounced.trim()
  const enoughTyped = typed.length >= QUERY_MIN_LENGTH
  const longEnough = query.length >= QUERY_MIN_LENGTH

  // The debounced term is the key, so one request fires per pause in the
  // typing. The collection id rides along for `inCollection`, which the client
  // cannot work out itself from a grid that holds one page.
  //
  // `open` is in the condition because the dialog outlives its overlay while it
  // animates out, and an enabled query behind it is one TMDB request per focus.
  //
  // `placeholderData` keeps the previous term's hits on screen while the next
  // request runs, so the list never empties and refills mid-typing.
  const results = useQuery(
    orpc.movies.search.queryOptions({
      input: { query, collectionId },
      enabled: open && longEnough,
      placeholderData: keepPreviousData,
    }),
  )

  // Counted from the keystroke, not the request: the debounce is part of the
  // wait, and a spinner that blinks off for it reads as a finished search.
  const searching = enoughTyped && (typed !== query || results.isFetching)

  const add = useMutation(
    orpc.collectionMovies.add.mutationOptions({
      onSuccess: (movie) =>
        setAdded((previous) => new Set(previous).add(movie.tmdbId)),
      // The row is still there and unchanged, so a toast is the whole report.
      onError: (error) => toast.error(errorMessage(error)),
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

  // Against the field, not the query: leaving this up for the debounce that
  // follows would argue with the spinner already turning.
  if (!enoughTyped) {
    body = (
      <p className="text-sm text-muted-foreground">
        Type at least {QUERY_MIN_LENGTH} characters to search TMDB.
      </p>
    )
  } else if (results.isPending) {
    // No skeleton: it promises a shape a search cannot know, and its three
    // rows are themselves a resize. The spinner in the field is the report,
    // and only the first search of a session gets here.
    body = null
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
    // An empty list is a verdict, and a held-over one is the *last* term's:
    // restating it under what is in the field now would claim we had looked.
    body = results.isPlaceholderData ? null : (
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

        {/* The spinner lives in the field: it answers the keystroke where the
            typing is, and moves nothing. */}
        <div className="relative">
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search TMDB…"
            aria-label="Search films"
            className="h-9 pr-9"
          />
          {searching ? (
            <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        {/* Only the results scroll: the field stays put while they move under
            it, so typing never chases the input up the screen.

            Height is measured from the results, so the dialog grows with them
            instead of snapping; past 85vh the flex column caps this box and it
            scrolls, as before. A phone dialog is already full height, so there
            it just fills. */}
        <div
          aria-busy={searching}
          style={{ height: bodyHeight }}
          className="min-h-0 overflow-y-auto motion-safe:transition-[height] motion-safe:duration-200 max-sm:flex-1"
        >
          {/* One line's worth even when empty, so the box does not collapse
              between the prompt and the first hits. */}
          <div ref={bodyRef} className="min-h-5">
            {body}
          </div>
        </div>
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
