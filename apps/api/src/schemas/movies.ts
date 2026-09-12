import { posterUrl } from '@curator/tmdb'
import { z } from 'zod'

import { collectionId } from './collections.js'
import { pageNumber, pageOf } from './common.js'

/**
 * The sample film every movie example in the docs describes. The poster path
 * is stored size-agnostic, exactly as a row holds it, and `posterUrl` turns it
 * into the url a response carries — TMDB's CDN is spelled out once, in the
 * package that owns it.
 */
const TMDB_ID_EXAMPLE = 129
export const POSTER_PATH_EXAMPLE = '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg'

/** TMDB's own ids: positive integers. */
export const tmdbId = z.coerce
  .number()
  .int()
  .positive()
  .meta({ examples: [TMDB_ID_EXAMPLE] })

/**
 * The fields every view of a movie shows, whether it is a search hit or a row
 * in a collection. Spread into both output schemas rather than nested, so the
 * client reads `movie.title` and not `movie.movie.title`.
 *
 * `posterUrl` is the full CDN url rather than TMDB's bare path (README decision
 * 8), so the SPA never has to know TMDB's image host or size names.
 *
 * The examples are one real film — the same one throughout the docs — so a
 * sample body reads as a movie rather than as a list of types.
 */
export const movieFields = {
  /** Not the coerced `tmdbId` above: coercion in the OpenAPI schema would
   * misdescribe the response. */
  tmdbId: z
    .number()
    .int()
    .meta({ examples: [TMDB_ID_EXAMPLE] }),
  title: z.string().meta({ examples: ['Spirited Away'] }),
  overview: z.string().meta({
    examples: [
      'A young girl wanders into a world of spirits and must work in a bathhouse to free her parents.',
    ],
  }),
  posterUrl: z
    .url()
    .nullable()
    .meta({
      examples: [posterUrl(POSTER_PATH_EXAMPLE)],
    }),
  releaseDate: z.iso
    .date()
    .nullable()
    .meta({ examples: ['2001-07-20'] }),
  /** TMDB's 0-10 score, shown next to the user's own rating. */
  voteAverage: z.number().meta({ examples: [8.5] }),
}

const QUERY_MIN_LENGTH = 2
/** TMDB stops paging here, and asking for more is an upstream error. */
const PAGE_MAX = 500

export const movieSearchInput = z.object({
  query: z
    .string()
    .trim()
    .min(QUERY_MIN_LENGTH, `Type at least ${QUERY_MIN_LENGTH} characters.`)
    .meta({ examples: ['spirited'] }),
  page: pageNumber(PAGE_MAX),
  /** The collection the search dialog is open over. Optional: only
   * `inCollection` needs it. */
  collectionId: collectionId.optional(),
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
  inCollection: z.boolean().meta({ examples: [true] }),
})

export const movieSearchPage = pageOf(movieSearchResult)
