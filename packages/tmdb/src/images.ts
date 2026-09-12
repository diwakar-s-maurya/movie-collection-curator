/**
 * TMDB's image CDN. Hardcoded rather than read from `GET /configuration`: one
 * fewer request and no boot-time dependency. Stored poster paths stay
 * size-agnostic, so a size can change without a migration.
 */
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'

/** The two sizes the app renders: grid and search cards, annotation sheet. */
export type PosterSize = 'w342' | 'w500'

/** Full poster URL for a `posterPath`, or null when the movie has no poster. */
export function posterUrl(
  posterPath: string | null,
  size: PosterSize = 'w342',
): string | null {
  return posterPath ? `${IMAGE_BASE_URL}/${size}${posterPath}` : null
}
