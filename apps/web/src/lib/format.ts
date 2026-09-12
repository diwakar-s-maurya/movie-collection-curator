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

/** A row of small facts with the empty ones dropped. The separator is a
 * decision about the app (UI_design 3), not each caller's to make. */
export function factLine(...facts: (string | null)[]): string {
  return facts.filter((fact) => fact !== null).join(' · ')
}

/** The year a film came out, from TMDB's ISO date. Null when TMDB has no date,
 * so a card prints nothing rather than a guess. */
export function releaseYear(releaseDate: string | null): string | null {
  return releaseDate?.slice(0, 4) ?? null
}
