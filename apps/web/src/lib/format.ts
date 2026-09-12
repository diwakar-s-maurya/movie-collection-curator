const MINUTES_PER_HOUR = 60

/** A total runtime in hours and minutes, or null when there is nothing to say.
 * Callers drop the null rather than print "0m". */
export function formatRuntime(minutes: number): string | null {
  if (minutes <= 0) return null

  const hours = Math.floor(minutes / MINUTES_PER_HOUR)
  const rest = minutes % MINUTES_PER_HOUR

  if (hours === 0) return `${rest}m`

  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

/** The year a film came out, from TMDB's ISO date. Null when TMDB has no date,
 * so a card prints nothing rather than a guess. */
export function releaseYear(releaseDate: string | null): string | null {
  return releaseDate?.slice(0, 4) ?? null
}
