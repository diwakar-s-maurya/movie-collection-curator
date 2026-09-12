import { genreSchema } from '@curator/tmdb'
import { z } from 'zod'

import { movieFields, tmdbId } from './movies.js'

/** The shape of the `genres` jsonb column, and of the field on the wire: one
 * definition, checked once when the column is read and once on the way out. */
export const genreList = z.array(genreSchema)

/** Identifies one movie's membership in one collection: the path of every
 * per-movie route, and the input of add and remove. */
export const collectionMovieInput = z.object({
  collectionId: z.uuid(),
  tmdbId,
})

/**
 * A movie in a collection: the snapshot TMDB was asked for when it was added,
 * flattened together with the annotation for this pairing. The same film in
 * another collection is another row with another note.
 */
export const collectionMovie = z.object({
  ...movieFields,
  /** The sheet renders from the row the grid already cached, so its larger
   * poster rides along rather than costing a request of its own. */
  posterUrlLarge: z.url().nullable(),
  /** Minutes, null when TMDB has none — the runtime total skips those. */
  runtime: z.number().int().nullable(),
  genres: genreList,
  note: z.string().nullable(),
  tags: z.array(z.string()),
  /** 1-5, held to that range by the column's CHECK. Null until rated. */
  rating: z.number().int().min(1).max(5).nullable(),
})
