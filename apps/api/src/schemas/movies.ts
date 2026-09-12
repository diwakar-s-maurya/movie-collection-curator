import { z } from 'zod'

/** TMDB's own ids: positive integers. */
export const tmdbId = z.coerce.number().int().positive()

/**
 * The fields every view of a movie shows, whether it is a search hit or a row
 * in a collection. Spread into both output schemas rather than nested, so the
 * client reads `movie.title` and not `movie.movie.title`.
 *
 * `posterUrl` is the full CDN url rather than TMDB's bare path (README decision
 * 8), so the SPA never has to know TMDB's image host or size names.
 */
export const movieFields = {
  /** Not the coerced `tmdbId` above: coercion in the OpenAPI schema would
   * misdescribe the response. */
  tmdbId: z.number().int(),
  title: z.string(),
  overview: z.string(),
  posterUrl: z.url().nullable(),
  releaseDate: z.iso.date().nullable(),
  /** TMDB's 0-10 score, shown next to the user's own rating. */
  voteAverage: z.number(),
}

const QUERY_MIN_LENGTH = 2
/** TMDB stops paging here, and asking for more is an upstream error. */
const PAGE_MAX = 500

/**
 * Coerced because this arrives as a query string: the SPA talks to the same
 * OpenAPI routes curl does, so `page=2` is the string `'2'` on the wire.
 */
const page = z.coerce.number().int().min(1).max(PAGE_MAX).default(1)

export const movieSearchInput = z.object({
  query: z
    .string()
    .trim()
    .min(QUERY_MIN_LENGTH, `Type at least ${QUERY_MIN_LENGTH} characters.`),
  page,
  /** The collection the search dialog is open over. Optional: only
   * `inCollection` needs it. */
  collectionId: z.uuid().optional(),
})

/** A search hit. No runtime and no genre names: TMDB's search endpoint sends
 * neither, which is why adding a movie calls the details endpoint. */
export const movieSearchResult = z.object({
  ...movieFields,
  /**
   * Whether this movie is already in the collection the search was scoped to,
   * so a hit renders "Added" instead of an add button. False for every hit when
   * no collection was named. The paginated grid holds one page, so the client
   * cannot work this out itself.
   */
  inCollection: z.boolean(),
})

export const movieSearchPage = z.object({
  page: z.number().int(),
  totalPages: z.number().int(),
  totalResults: z.number().int(),
  results: z.array(movieSearchResult),
})
