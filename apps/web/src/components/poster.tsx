import { cn } from 'cn'

type PosterProps = {
  url: string | null
  title: string
  className?: string
}

/**
 * How a film is recognised, at every size the app shows one. Always 2:3, so a
 * grid row never goes ragged and the search list never reflows as posters load.
 *
 * A film TMDB has no poster for gets a tile carrying its title rather than a
 * broken image. The tile is hidden from a screen reader, which would otherwise
 * hear the same film named twice.
 */
const Poster = ({ url, title, className }: PosterProps) => {
  const shape = cn('aspect-2/3 w-full bg-muted', className)

  if (!url) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          shape,
          'flex items-center justify-center p-2 text-center text-xs text-balance text-muted-foreground',
        )}
      >
        {title}
      </div>
    )
  }

  return (
    // The title as alt text, not "poster of": the image stands for the film.
    <img
      src={url}
      alt={title}
      loading="lazy"
      className={cn(shape, 'object-cover')}
    />
  )
}

export { Poster }
