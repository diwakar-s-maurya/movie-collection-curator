import { Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { ErrorText } from '@/components/error-text'
import { Poster } from '@/components/poster'
import { StarRating } from '@/components/star-rating'
import { TagInput } from '@/components/tag-input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { NOTE_MAX_LENGTH, sameTags } from '@/lib/annotation'
import { factLine, formatRuntime, releaseYear } from '@/lib/format'
import type { CollectionMovie } from '@/lib/orpc'
import { useUpdateAnnotation } from '@/lib/use-update-annotation'

type Draft = { tmdbId: number; note: string; tags: string[] }

/** The editor as the row currently stands. Pure, so it serves both as the seed
 * when the dialog opens and as what an edit is compared against. */
const seed = (movie: CollectionMovie): Draft => ({
  tmdbId: movie.tmdbId,
  note: movie.note ?? '',
  tags: movie.tags,
})

type AnnotationDialogProps = {
  collectionId: string
  /** The film being annotated, read by the route out of the page the grid has
   * already cached. Null closes the dialog. */
  movie: CollectionMovie | null
  onClose: () => void
  /** Asks the route to remove this film. What happens afterwards — the
   * confirm, the refetch, stepping back a page — is all about the grid, which
   * belongs to the route. */
  onRemove: () => void
}

/**
 * One film, opened over the collection: the facts TMDB has on it and the three
 * things the user has to say about it. The only place the full facts appear.
 *
 * A dialog rather than a side panel — wide enough for the poster and the
 * writing side by side, with the grid dimmed behind. Wider than the search
 * dialog so the two do not read as the same panel.
 *
 * Note and tags save together on one button, because they are one row and one
 * write. Nothing autosaves: a textarea saving on a debounce writes a lot of
 * half-sentences. Rating is the exception — it writes on the click, here as on
 * the card, through the same mutation.
 */
const AnnotationDialog = ({
  collectionId,
  movie,
  onClose,
  onRemove,
}: AnnotationDialogProps) => {
  const update = useUpdateAnnotation(collectionId)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)

  // The dialog outlives its film by one animation: without this the panel
  // would empty out while it is still fading.
  const lastMovie = useRef(movie)
  if (movie) lastMovie.current = movie
  const shown = movie ?? lastMovie.current

  // Seeded on open, re-seeded when opened on another film. During render
  // rather than in an effect, which would paint one frame of the old note.
  if (movie && draft?.tmdbId !== movie.tmdbId) setDraft(seed(movie))

  // Before the first film is ever selected, and only then.
  if (!shown) return null

  const stored = seed(shown)
  const fields = draft ?? stored
  const edited =
    fields.note !== stored.note || !sameTags(fields.tags, stored.tags)

  const close = () => {
    setDraft(null)
    setConfirmingDiscard(false)
    onClose()
  }

  const year = releaseYear(shown.releaseDate)
  const runtime = shown.runtime === null ? null : formatRuntime(shown.runtime)
  const facts = factLine(year, runtime, `${shown.voteAverage.toFixed(1)} TMDB`)

  return (
    <>
      <Dialog
        open={movie !== null}
        // A typed note is the most expensive thing in the app to lose, so Esc,
        // the backdrop and the X all ask first when there is one.
        onOpenChange={(open) => {
          if (open) return
          if (edited) setConfirmingDiscard(true)
          else close()
        }}
      >
        {/* Full screen on a phone, where a modal with a margin round it wastes
            the room the note needs. */}
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-y-auto p-0 max-sm:h-dvh max-sm:max-h-none max-sm:max-w-none max-sm:rounded-none sm:max-w-2xl">
          <DialogHeader className="flex-row gap-4 p-4">
            <Poster
              url={shown.posterUrlLarge}
              title={shown.title}
              className="w-28 shrink-0 rounded-md"
            />
            <div className="flex flex-col gap-2">
              {/* Room for the close button, which sits in the corner the title
                  would otherwise run into. */}
              <DialogTitle className="pr-8">{shown.title}</DialogTitle>
              <DialogDescription>{facts}</DialogDescription>
              {shown.genres.length > 0 ? (
                <ul className="flex flex-wrap gap-1">
                  {shown.genres.map((genre) => (
                    <li key={genre.id}>
                      {/* Muted, where the user's own tags are not: TMDB's
                          labels and the user's vocabulary are different
                          things. */}
                      <Badge
                        variant="outline"
                        className="text-muted-foreground"
                      >
                        {genre.name}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : null}
              {shown.overview ? (
                <p className="text-sm text-muted-foreground">
                  {shown.overview}
                </p>
              ) : null}
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-5 border-t p-4">
            <div className="flex items-center gap-3">
              {/* Not a `Label`: the radio group below names itself, and a
                  `<label>` with nothing to point at is a control a screen
                  reader offers and a click does nothing with. */}
              <p className="text-sm font-medium">Your rating</p>
              <StarRating
                value={shown.rating}
                title={shown.title}
                // Straight through, like the card: this reads back off the
                // cached row, so the star fills on the click.
                onChange={(rating) =>
                  update.mutate({ tmdbId: shown.tmdbId, rating })
                }
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="annotation-note">Note</Label>
              <Textarea
                id="annotation-note"
                value={fields.note}
                onChange={(event) =>
                  setDraft({ ...fields, note: event.target.value })
                }
                maxLength={NOTE_MAX_LENGTH}
                rows={4}
                placeholder="What is this film doing in this collection?"
              />
              <p className="self-end text-xs text-muted-foreground">
                {fields.note.length} / {NOTE_MAX_LENGTH}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="annotation-tags">Tags</Label>
              <TagInput
                id="annotation-tags"
                tags={fields.tags}
                onChange={(tags) => setDraft({ ...fields, tags })}
              />
            </div>
          </div>

          <DialogFooter className="m-0 mt-auto flex-row items-center justify-between gap-3">
            {/* Far from Save and ghost rather than the filled `destructive`
                variant: removing belongs on the film's own screen, but it is
                the quieter of the two things the footer does. The hover colour
                is restated because ghost's own hover resets the text. */}
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onRemove}
            >
              <Trash2 />
              Remove
              <span className="sr-only">
                {shown.title} from this collection
              </span>
            </Button>

            <div className="flex items-center gap-3">
              {/* Saving is the last thing the dialog is for, so a save that
                  lands closes it. Only on success: a failure leaves the panel
                  open with the note still in the box, since nothing the user
                  wrote should be thrown away by one. */}
              <ErrorText error={update.error} />
              <Button
                disabled={!edited || update.isPending}
                onClick={() =>
                  update.mutate(
                    {
                      tmdbId: shown.tmdbId,
                      note: fields.note,
                      tags: fields.tags,
                    },
                    { onSuccess: close },
                  )
                }
              >
                {update.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmingDiscard}
        onOpenChange={setConfirmingDiscard}
        title="Discard your changes?"
        description={
          <>
            The note and tags on{' '}
            <strong className="text-foreground">{shown.title}</strong> have not
            been saved.
          </>
        }
        confirmLabel="Discard"
        pending={false}
        onConfirm={close}
      />
    </>
  )
}

export { AnnotationDialog }
