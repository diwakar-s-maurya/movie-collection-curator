import { DeleteIconButton } from '@/components/delete-icon-button'
import { Poster } from '@/components/poster'
import { StarRating } from '@/components/star-rating'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { releaseYear } from '@/lib/format'
import type { CollectionMovie } from '@/lib/orpc'

type MovieCardProps = {
  movie: CollectionMovie
  /** Opens the annotation dialog on this film. */
  onOpen: () => void
  onRate: (rating: number | null) => void
  onRemove: () => void
}

/**
 * A film in the open collection. The poster is the identity and the title sits
 * under it as text, so it stays readable whatever TMDB sends.
 *
 * No genres here: inside a collection the user's own vocabulary matters more
 * than TMDB's labels.
 */
const MovieCard = ({ movie, onOpen, onRate, onRemove }: MovieCardProps) => {
  const year = releaseYear(movie.releaseDate)

  return (
    <Card className="group relative gap-0 py-0">
      <Poster url={movie.posterUrl} title={movie.title} />

      {/* Over the poster, and above the title's overlay or it would never be
          the click. */}
      <DeleteIconButton
        label={`Remove ${movie.title} from this collection`}
        className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-xs"
        onClick={onRemove}
      />

      <div className="flex flex-col gap-2 p-3">
        {/* The title is the control, stretched over the card by an `::after`
            overlay, so the whole card opens the editor and there is still
            exactly one thing in the accessibility tree that does. */}
        <button
          type="button"
          onClick={onOpen}
          className="text-left leading-snug font-medium outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
        >
          {movie.title}
        </button>
        {year ? <p className="text-sm text-muted-foreground">{year}</p> : null}

        {/* Above the overlay: rating from the grid is one click, and not the
            click that opens the editor. */}
        <StarRating
          value={movie.rating}
          title={movie.title}
          onChange={onRate}
          className="relative -ml-0.5"
        />
        {movie.tags.length > 0 ? (
          <ul className="relative flex flex-wrap gap-1">
            {movie.tags.map((tag) => (
              <li key={tag}>
                <Badge variant="secondary">{tag}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Card>
  )
}

export { MovieCard }
