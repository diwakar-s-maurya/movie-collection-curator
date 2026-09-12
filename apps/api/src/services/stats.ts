import { z } from 'zod'

import { db } from '../db.js'
import { collectionStats, summaryStats } from '../schemas/stats.js'

export type SummaryStats = z.infer<typeof summaryStats>
export type CollectionStats = z.infer<typeof collectionStats>

/** Both breakdowns render as a row of chips rather than a chart, so five is
 * what fits before the strip starts wrapping. */
const TOP_N = 5

/** What a collection with nothing in it reads as. Only the list needs this:
 * its query groups by collection id, so an empty collection gets no row. */
const emptySummary: SummaryStats = {
  movieCount: 0,
  runtimeMinutes: 0,
  ratedCount: 0,
  averageRating: null,
  yearMin: null,
  yearMax: null,
}

/**
 * Raw SQL is outside Prisma's typing, so what comes back is parsed rather than
 * trusted: a renamed column is a Zod error here, not a wrong number on the page.
 * `collectionStats` extends `summaryStats`, so a stat added to one query and
 * forgotten in the other fails at the parse.
 */
const summaryRows = summaryStats.extend({ collectionId: z.uuid() }).array()

/** The detail query aggregates without grouping, so it answers exactly one
 * row. A tuple rather than an array, so that is checked rather than assumed. */
const statsRow = z.tuple([collectionStats])

/**
 * The rows handed in, each with the numbers its card shows, in one grouped
 * query — a list costs two queries whether it holds one collection or fifty.
 * Rows in and rows out, so "an empty collection has no row to group" stays in
 * here instead of in the caller.
 *
 * Scoping is the caller's: the query below has no idea who is asking.
 */
export async function withSummaries<Row extends { id: string }>(
  collections: Row[],
): Promise<(Row & { stats: SummaryStats })[]> {
  if (collections.length === 0) return []

  const rows = summaryRows.parse(
    await db.$queryRaw`
      SELECT cm.collection_id                            AS "collectionId",
             count(*)::int                               AS "movieCount",
             coalesce(sum(m.runtime), 0)::int            AS "runtimeMinutes",
             count(cm.rating)::int                       AS "ratedCount",
             avg(cm.rating)::float                       AS "averageRating",
             -- Year off the aggregate: two extracts per group, not per film.
             extract(year FROM min(m.release_date))::int AS "yearMin",
             extract(year FROM max(m.release_date))::int AS "yearMax"
      FROM collection_movies cm
      JOIN movies m ON m.tmdb_id = cm.tmdb_id
      -- The ids arrive as text; Postgres will not compare a uuid column to those.
      WHERE cm.collection_id = ANY(${collections.map(({ id }) => id)}::uuid[])
      GROUP BY cm.collection_id`,
  )

  // Only collections holding films come back; the rest take the zeros.
  const summaries = new Map<string, SummaryStats>(
    rows.map(({ collectionId, ...summary }) => [collectionId, summary]),
  )

  return collections.map((collection) => ({
    ...collection,
    stats: summaries.get(collection.id) ?? emptySummary,
  }))
}

/**
 * Everything the stats strip shows for one collection, in one statement. The
 * summary and both breakdowns aggregate the same rows three ways, so `films`
 * names them once; three references make Postgres materialise it rather than
 * inline it, so the breakdowns do not go back to the tables.
 *
 * Each breakdown orders twice on purpose: the inner ORDER BY is what LIMIT
 * picks the top five by, the one inside json_agg fixes the order of the array.
 * Both break ties by name, so equal counts do not swap places between reloads.
 */
export async function statsFor(collectionId: string): Promise<CollectionStats> {
  const [stats] = statsRow.parse(
    await db.$queryRaw`
      WITH films AS (
        SELECT cm.rating, cm.tags, m.runtime, m.release_date, m.genres
        FROM collection_movies cm
        JOIN movies m ON m.tmdb_id = cm.tmdb_id
        -- Cast for the same reason the list query casts.
        WHERE cm.collection_id = ${collectionId}::uuid
      ),
      -- The jsonb array of { id, name } on each film; the chips show the name.
      genres AS (
        SELECT g->>'name' AS name, count(*)::int AS count
        FROM films CROSS JOIN LATERAL jsonb_array_elements(films.genres) g
        GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT ${TOP_N}
      ),
      -- The user's own labels, off the text[] column on the membership row.
      tags AS (
        SELECT t AS name, count(*)::int AS count
        FROM films CROSS JOIN LATERAL unnest(films.tags) t
        GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT ${TOP_N}
      )
      SELECT count(*)::int                                   AS "movieCount",
             coalesce(sum(films.runtime), 0)::int            AS "runtimeMinutes",
             count(films.rating)::int                        AS "ratedCount",
             avg(films.rating)::float                        AS "averageRating",
             -- Year off the aggregate: two extracts per group, not per film.
             extract(year FROM min(films.release_date))::int AS "yearMin",
             extract(year FROM max(films.release_date))::int AS "yearMax",
             coalesce(
               (SELECT json_agg(g ORDER BY g.count DESC, g.name) FROM genres g),
               '[]'::json
             ) AS genres,
             coalesce(
               (SELECT json_agg(t ORDER BY t.count DESC, t.name) FROM tags t),
               '[]'::json
             ) AS tags
      FROM films`,
  )

  return stats
}
