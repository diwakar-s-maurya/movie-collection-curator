import { z } from 'zod'

/**
 * The numbers every view of a collection shows. The list card and the top of
 * the detail strip read the same shape, so one grouped query fills both.
 *
 * Nothing here is stored (README decision 5). A film TMDB has no runtime or
 * release date for is still counted, just not summed or spanned.
 */
export const summaryStats = z.object({
  movieCount: z
    .number()
    .int()
    .meta({ examples: [12] }),
  /** Total of the runtimes TMDB knows, in minutes. */
  runtimeMinutes: z
    .number()
    .int()
    .meta({ examples: [1418] }),
  /** How many of the movies carry a rating, so one 5-star cannot read as a
   * 5.0 collection. */
  ratedCount: z
    .number()
    .int()
    .meta({ examples: [9] }),
  /** Mean of the ratings that exist, null when nothing is rated. Unrounded:
   * decimals are the strip's business. */
  averageRating: z
    .number()
    .nullable()
    .meta({ examples: [4.11] }),
  /** Release-year span. Both null when no film in the collection has a date. */
  yearMin: z
    .number()
    .int()
    .nullable()
    .meta({ examples: [1988] }),
  yearMax: z
    .number()
    .int()
    .nullable()
    .meta({ examples: [2023] }),
})

/** One row of a breakdown: a genre or a tag, and how many films carry it. */
const breakdownEntry = z.object({
  name: z.string().meta({ examples: ['Animation'] }),
  count: z
    .number()
    .int()
    .meta({ examples: [4] }),
})

/** The summary plus the two breakdowns, which only the collection's own page
 * asks for: TMDB's view of the collection beside the user's. */
export const collectionStats = summaryStats.extend({
  genres: z.array(breakdownEntry),
  tags: z.array(breakdownEntry),
})
