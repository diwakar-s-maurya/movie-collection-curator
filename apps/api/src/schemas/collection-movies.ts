import { genreSchema, posterUrl } from '@curator/tmdb'
import { z } from 'zod'

import { collectionId } from './collections.js'
import { pageNumber, pageOf, pageSize } from './common.js'
import { movieFields, POSTER_PATH_EXAMPLE, tmdbId } from './movies.js'

const NOTE_MAX_LENGTH = 2000
const TAGS_MAX = 20

const NOTE_EXAMPLE = 'The bathhouse holds up on a fourth watch.'
const TAGS_EXAMPLE = ['ghibli', 'comfort']
const RATING_EXAMPLE = 5

/** The shape of the `genres` jsonb column, and of the field on the wire: one
 * definition, checked once when the column is read and once on the way out. */
export const genreList = z.array(genreSchema).meta({
  examples: [
    [
      { id: 16, name: 'Animation' },
      { id: 14, name: 'Fantasy' },
    ],
  ],
})

/** Identifies one movie's membership in one collection: the path of every
 * per-movie route, and the input of add and remove. */
export const collectionMovieInput = z.object({
  collectionId,
  tmdbId,
})

/** The user's own note. Trimmed, and blank becomes null so "no note" is one
 * value everywhere downstream. */
const note = z
  .string()
  .trim()
  .max(NOTE_MAX_LENGTH, `Notes are at most ${NOTE_MAX_LENGTH} characters.`)
  .nullable()
  .transform((value) => value || null)
  .meta({ examples: [NOTE_EXAMPLE] })

/**
 * Free text, so the same tag has to arrive as the same string or the tag
 * breakdown counts it twice: trimmed, empties dropped, de-duplicated, in the
 * order they were typed. Case is left alone — the chips show it back as typed.
 */
const tags = z
  .array(z.string().trim())
  .transform((values) => [...new Set(values.filter(Boolean))])
  // Counted after normalising, so blanks and duplicates cannot push a
  // legitimate list over the limit.
  .refine(
    (values) => values.length <= TAGS_MAX,
    `A movie carries at most ${TAGS_MAX} tags.`,
  )
  .meta({ examples: [TAGS_EXAMPLE] })

/** 1-5 whole stars, or null for unrated. The column's CHECK says the same
 * thing; this says it before a round trip, with a message the sheet can show. */
const rating = z
  .number()
  .int('Ratings are whole stars.')
  .min(1)
  .max(5)
  .nullable()
  .meta({ examples: [RATING_EXAMPLE] })

/**
 * A movie in a collection: the snapshot TMDB was asked for when it was added,
 * flattened together with the annotation for this pairing. The same film in
 * another collection is another row with another note.
 */
export const collectionMovie = z.object({
  ...movieFields,
  /** The sheet renders from the row the grid already cached, so its larger
   * poster rides along rather than costing a request of its own. */
  posterUrlLarge: z
    .url()
    .nullable()
    .meta({
      examples: [posterUrl(POSTER_PATH_EXAMPLE, 'w500')],
    }),
  /** Minutes, null when TMDB has none — the runtime total skips those. */
  runtime: z
    .number()
    .int()
    .nullable()
    .meta({ examples: [125] }),
  genres: genreList,
  note: z
    .string()
    .nullable()
    .meta({ examples: [NOTE_EXAMPLE] }),
  tags: z.array(z.string()).meta({ examples: [TAGS_EXAMPLE] }),
  /** 1-5, held to that range by the column's CHECK. Null until rated. */
  rating: z
    .number()
    .int()
    .min(1)
    .max(5)
    .nullable()
    .meta({ examples: [RATING_EXAMPLE] }),
})

/** One page of a collection. The cap on `pageSize` stops a hand-written
 * request from asking for a whole collection at once. */
export const collectionMoviesListInput = collectionMovieInput
  .pick({ collectionId: true })
  .extend({ page: pageNumber(), pageSize: pageSize() })

export const collectionMoviePage = pageOf(collectionMovie)

/**
 * A patch of the annotation, and the only write to it: a rating click and a
 * note-plus-tags save touch the same row, so they are the same procedure.
 *
 * An omitted field is left alone; `null` on note or rating clears it; `tags`
 * replaces the whole array. A body with no fields is a client bug, so it is
 * rejected rather than hidden behind a 200.
 */
export const updateAnnotationInput = z
  .object({
    ...collectionMovieInput.shape,
    note: note.optional(),
    tags: tags.optional(),
    rating: rating.optional(),
  })
  .refine(
    (input) =>
      input.note !== undefined ||
      input.tags !== undefined ||
      input.rating !== undefined,
    { message: 'Send at least one of note, tags or rating.' },
  )
