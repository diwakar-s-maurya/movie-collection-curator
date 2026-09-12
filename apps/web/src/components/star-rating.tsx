import { cn } from 'cn'
import { Star } from 'lucide-react'
import type { KeyboardEvent } from 'react'

const STARS = [1, 2, 3, 4, 5]

/** Filled stars differ in fill as well as hue, so the rating survives being
 * read without colour. */
const starClass = (filled: boolean) =>
  filled ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'

type StarRowProps = {
  /** How many stars are filled. Rounded by the caller — this draws whole
   * stars. */
  filled: number
  className?: string
}

/** Five stars with nothing behind them, for the stats strip. Hidden from a
 * screen reader: the average beside them already says it. */
const StarRow = ({ filled, className }: StarRowProps) => (
  <span aria-hidden="true" className={cn('flex', className)}>
    {STARS.map((star) => (
      <Star key={star} className={cn('size-4', starClass(star <= filled))} />
    ))}
  </span>
)

type StarRatingProps = {
  /** The rating on the row, null until the film is rated. */
  value: number | null
  /** The film's title, so each star can say what it rates. */
  title: string
  onChange: (rating: number | null) => void
  className?: string
}

/**
 * The app's highest-frequency action: the grid card and the annotation dialog
 * render the same control and write through the same mutation. Clicking the
 * current rating again clears it, and the button says so on hover.
 *
 * A radio group, not five buttons: one tab stop, arrows move between the stars,
 * Enter or Space sets the focused one.
 *
 * Buttons carry the roles rather than native radios — a native radio moves its
 * selection with the arrow keys, and every move here is a write.
 */
const StarRating = ({ value, title, onChange, className }: StarRatingProps) => {
  // Arrows move focus and leave the value alone; the button turns Enter and
  // Space into the click that sets it.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (step === 0) return

    event.preventDefault()
    const stars = [
      ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
        '[role=radio]',
      ),
    ]
    const next =
      stars.indexOf(document.activeElement as HTMLButtonElement) + step

    stars[Math.min(Math.max(next, 0), stars.length - 1)]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={`Your rating of ${title}`}
      onKeyDown={onKeyDown}
      className={cn('flex w-fit', className)}
    >
      {STARS.map((star) => {
        const chosen = star === value

        return (
          // biome-ignore lint/a11y/useSemanticElements: see above — a native radio writes on every arrow key.
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={chosen}
            aria-label={`Rate ${title} ${star} of 5`}
            title={chosen ? 'Clear this rating' : undefined}
            // One tab stop for the group: Tab lands on the rating that is set,
            // or on the first star when there is none.
            tabIndex={star === (value ?? 1) ? 0 : -1}
            onClick={() => onChange(chosen ? null : star)}
            className="cursor-pointer rounded-sm p-0.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Star
              className={cn(
                'size-4 transition-colors',
                starClass(value !== null && star <= value),
              )}
            />
          </button>
        )
      })}
    </div>
  )
}

export { StarRating, StarRow }
