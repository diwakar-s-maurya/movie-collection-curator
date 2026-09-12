import { DeleteIconButton } from '@/components/delete-icon-button'
import { Poster } from '@/components/poster'
import { Card } from '@/components/ui/card'
import { releaseYear } from '@/lib/format'
import type { CollectionMovie } from '@/lib/orpc'

type MovieCardProps = {
  movie: CollectionMovie
  onRemove: () => void
}

/**
 * A film in the open collection. The poster is the identity and the title sits
 * under it as text, so it stays readable whatever TMDB sends.
 *
 * No genres here: inside a collection the user's own vocabulary matters more
 * than TMDB's labels.
 */
const MovieCard = ({ movie, onRemove }: MovieCardProps) => {
  const year = releaseYear(movie.releaseDate)

  return (
    <Card className="relative gap-0 py-0">
      <Poster url={movie.posterUrl} title={movie.title} />

      {/* Over the poster rather than under the title: the card's body is the
          film's identity, and removing is the one thing on it that destroys
          something. */}
      <DeleteIconButton
        label={`Remove ${movie.title} from this collection`}
        className="absolute top-2 right-2 bg-background/80 backdrop-blur-xs"
        onClick={onRemove}
      />

      <div className="flex flex-col gap-1 p-3">
        <p className="leading-snug font-medium">{movie.title}</p>
        {year ? <p className="text-sm text-muted-foreground">{year}</p> : null}
      </div>
    </Card>
  )
}

export { MovieCard }
