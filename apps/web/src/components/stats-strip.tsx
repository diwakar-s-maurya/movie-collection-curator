import type { ReactNode } from 'react'

import { StarRow } from '@/components/star-rating'
import { Badge } from '@/components/ui/badge'
import { formatRuntime } from '@/lib/format'
import type { CollectionStats } from '@/lib/orpc'

type Breakdown = CollectionStats['genres']

/** The span as a line: one year when every film came out in it, nothing at all
 * when TMDB has no date for any of them. */
function yearSpan(from: number | null, to: number | null): string | null {
  if (from === null || to === null) return null

  return from === to ? `${from}` : `${from} – ${to}`
}

type StatProps = {
  label: string
  children: ReactNode
  /** The qualifier under the number, where one figure needs another to be read
   * honestly — an average needs to say how many films it is an average of. */
  footnote?: string
}

/**
 * One headline number with the word for what it is: "1972" alone is a puzzle,
 * "Years 1972" is a fact.
 *
 * Proportional figures, not tabular — equal-width digits make a standalone
 * number look gappy at this size. The counts below stack into a column and do
 * get them.
 */
const Stat = ({ label, children, footnote }: StatProps) => (
  <div className="flex flex-col gap-1">
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="flex items-center gap-2 text-lg leading-none font-medium">
      {children}
    </div>
    {footnote ? (
      <p className="text-xs text-muted-foreground">{footnote}</p>
    ) : null}
  </div>
)

type BreakdownProps = {
  entries: Breakdown
  /** `outline` for TMDB's genres, `secondary` for the user's own tags — the
   * same two styles the annotation dialog tells them apart with. */
  variant: 'outline' | 'secondary'
}

/**
 * A breakdown as chips, count included, ordered by count. Not a bar list: at
 * five rows a bar list spends the height of the whole panel drawing five small
 * integers, where chips fit on one wrapped line. That gives up proportion at a
 * glance, which at this size costs the reader almost nothing.
 */
const ChipBreakdown = ({ entries, variant }: BreakdownProps) => (
  <ul className="flex flex-wrap gap-1.5">
    {entries.map((entry) => (
      <li key={entry.name}>
        <Badge
          variant={variant}
          className={variant === 'outline' ? 'text-muted-foreground' : ''}
        >
          {entry.name}
          <span className="tabular-nums text-muted-foreground">
            {entry.count}
          </span>
        </Badge>
      </li>
    ))}
  </ul>
)

type BreakdownColumnProps = { title: string; children: ReactNode }

const BreakdownColumn = ({ title, children }: BreakdownColumnProps) => (
  <div className="flex flex-col gap-2">
    <p className="text-xs text-muted-foreground">{title}</p>
    {children}
  </div>
)

type StatsStripProps = { stats: CollectionStats }

/**
 * Everything the collection is, above everything in it: a row of headline
 * figures, then the two breakdowns side by side under a rule. Figures first,
 * ordered by the question each answers; breakdowns second, as the slower read,
 * in two columns so TMDB's view and the user's sit beside each other.
 *
 * All of it arrives with `collections.get`, so the strip costs no request of
 * its own, and an annotation write invalidates that query.
 */
const StatsStrip = ({ stats }: StatsStripProps) => {
  const runtime = formatRuntime(stats.runtimeMinutes)
  const span = yearSpan(stats.yearMin, stats.yearMax)
  const hasBreakdowns = stats.genres.length > 0 || stats.tags.length > 0

  return (
    <section
      aria-label="Collection statistics"
      className="flex flex-col gap-4 rounded-xl border bg-muted/30 p-4"
    >
      {/* An empty collection is one tile reading zero. The others are left out
          rather than printed as zeroes: "0h 0m" and "0.0 avg" read as facts
          about films that are not there. */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
        <Stat label="Films">{stats.movieCount}</Stat>
        {runtime ? <Stat label="Runtime">{runtime}</Stat> : null}
        {stats.averageRating === null ? null : (
          <Stat
            label="Average rating"
            footnote={`${stats.ratedCount} of ${stats.movieCount} rated`}
          >
            <StarRow filled={Math.round(stats.averageRating)} />
            {stats.averageRating.toFixed(1)}
          </Stat>
        )}
        {span ? (
          <Stat label={stats.yearMin === stats.yearMax ? 'Year' : 'Years'}>
            {span}
          </Stat>
        ) : null}
      </div>

      {hasBreakdowns ? (
        <div className="grid gap-x-8 gap-y-4 border-t pt-4 sm:grid-cols-2">
          {stats.genres.length > 0 ? (
            <BreakdownColumn title="Genres">
              <ChipBreakdown entries={stats.genres} variant="outline" />
            </BreakdownColumn>
          ) : null}
          {stats.tags.length > 0 ? (
            <BreakdownColumn title="Your tags">
              <ChipBreakdown entries={stats.tags} variant="secondary" />
            </BreakdownColumn>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export { StatsStrip }
