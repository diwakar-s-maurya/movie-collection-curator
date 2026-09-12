import { z } from 'zod'

// Two layers per endpoint: a Zod schema for TMDB's raw shape, then a mapper to
// this library's own DTO, composed into the one schema the client uses. Callers
// only ever see the DTO, so nothing downstream depends on a TMDB field name.
//
// The raw schemas are deliberately not `.strict()`: unknown keys are dropped,
// so a new TMDB field is a no-op rather than an outage.

/** TMDB sends '' for a release date it does not have. */
const releaseDate = z
  .string()
  .nullish()
  .transform((value) => value || null)

/** A missing overview comes back as '' or null; both mean "no overview". */
const overview = z
  .string()
  .nullish()
  .transform((value) => value ?? '')

/** TMDB uses 0 for a runtime it does not have. */
const runtime = z
  .number()
  .nullish()
  .transform((value) => value || null)

/** Absent posters come back as null or, on some rows, not at all. */
const posterPath = z
  .string()
  .nullish()
  .transform((value) => value ?? null)

/** Also the shape of the `genres` jsonb column the API stores it in. */
export const genreSchema = z.object({ id: z.number(), name: z.string() })

export type Genre = z.infer<typeof genreSchema>

const rawMovieSummary = z.object({
  id: z.number(),
  title: z.string(),
  overview,
  poster_path: posterPath,
  release_date: releaseDate,
  vote_average: z.number(),
})

/** A movie as a search hit carries it: no runtime, no genre names. */
export type MovieSummary = {
  tmdbId: number
  title: string
  overview: string
  posterPath: string | null
  /** ISO `YYYY-MM-DD`, or null when TMDB has no date. */
  releaseDate: string | null
  voteAverage: number
}

/** A movie from the details endpoint: everything the snapshot stores. */
export type MovieDetails = MovieSummary & {
  /** Minutes, or null when TMDB has no runtime. */
  runtime: number | null
  genres: Genre[]
}

export type MovieSearchPage = {
  page: number
  totalPages: number
  totalResults: number
  results: MovieSummary[]
}

function toMovieSummary(raw: z.output<typeof rawMovieSummary>): MovieSummary {
  return {
    tmdbId: raw.id,
    title: raw.title,
    overview: raw.overview,
    posterPath: raw.poster_path,
    releaseDate: raw.release_date,
    voteAverage: raw.vote_average,
  }
}

/** `GET /search/movie`, validated and mapped to the DTO in one pass. */
export const movieSearchPage: z.ZodType<MovieSearchPage> = z
  .object({
    page: z.number(),
    total_pages: z.number(),
    total_results: z.number(),
    results: z.array(rawMovieSummary),
  })
  .transform((raw) => ({
    page: raw.page,
    totalPages: raw.total_pages,
    totalResults: raw.total_results,
    results: raw.results.map(toMovieSummary),
  }))

/** `GET /movie/{movie_id}`, validated and mapped to the DTO in one pass. */
export const movieDetails: z.ZodType<MovieDetails> = rawMovieSummary
  .extend({ runtime, genres: z.array(genreSchema).nullish() })
  .transform((raw) => ({
    ...toMovieSummary(raw),
    runtime: raw.runtime,
    genres: raw.genres ?? [],
  }))
