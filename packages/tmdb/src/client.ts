import { z } from 'zod'

import { TmdbError, type TmdbErrorCode } from './errors.js'
import {
  type MovieDetails,
  type MovieSearchPage,
  movieDetails,
  movieSearchPage,
} from './movies.js'

const DEFAULT_BASE_URL = 'https://api.themoviedb.org/3'
const DEFAULT_LANGUAGE = 'en-US'
/** TMDB answers in well under a second and both calls sit inside a user's
 * request, so past five seconds an error beats a spinner. */
const DEFAULT_TIMEOUT_MS = 5_000

/** The slice of `fetch` this client uses; tests pass a fake. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export type TmdbClientOptions = {
  /** v4 read access token, sent as `Authorization: Bearer`. */
  accessToken: string
  baseUrl?: string
  /** TMDB `language` param, applied to every request. */
  language?: string
  /** Per-request deadline, covering the response body. Default 5s. */
  timeoutMs?: number
  fetch?: FetchLike
}

export type TmdbClient = {
  /** Resolves when TMDB accepts the access token, and rejects with an
   * `UNAUTHORIZED` `TmdbError` when it does not — for a caller that wants to
   * find out at boot rather than on a user's first search. */
  verifyAccessToken: () => Promise<void>
  searchMovies: (
    query: string,
    options?: { page?: number },
  ) => Promise<MovieSearchPage>
  getMovie: (tmdbId: number) => Promise<MovieDetails>
}

type QueryParams = Record<string, string | number | boolean>

/** `GET /authentication` answers `{ success: true }` for a good token and 401s
 * for a bad one, so the body carries nothing worth returning. */
const accessTokenAccepted = z.object({ success: z.literal(true) })

/** Statuses TMDB uses for something the caller can act on differently. */
const CODE_BY_STATUS: Record<number, TmdbErrorCode> = {
  401: 'UNAUTHORIZED',
  404: 'NOT_FOUND',
  429: 'RATE_LIMITED',
}

export function createTmdbClient(options: TmdbClientOptions): TmdbClient {
  const { accessToken } = options
  if (!accessToken) {
    // Thrown at construction, not on a call: this is config, not TMDB.
    throw new Error('createTmdbClient: accessToken is required')
  }

  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL
  const language = options.language ?? DEFAULT_LANGUAGE
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const doFetch = options.fetch ?? globalThis.fetch

  /**
   * One place for auth, the client-wide params, query encoding, JSON parsing,
   * response validation and error mapping, so a new endpoint is a schema and
   * three lines. `schema` maps to the DTO as it validates.
   */
  async function request<T>(
    path: string,
    params: QueryParams,
    schema: z.ZodType<T>,
  ): Promise<T> {
    const url = new URL(baseUrl + path)
    for (const [key, value] of Object.entries({ language, ...params })) {
      url.searchParams.set(key, String(value))
    }

    // A timeout can surface from the fetch or from reading the body;
    // `AbortSignal.timeout` aborts with a DOMException named TimeoutError.
    const upstream = (cause: unknown, message: string, status?: number) => {
      const timedOut = cause instanceof Error && cause.name === 'TimeoutError'
      return new TmdbError(
        'UPSTREAM',
        timedOut ? `TMDB ${path} timed out after ${timeoutMs}ms` : message,
        { status, cause },
      )
    }

    let response: Response
    try {
      response = await doFetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
        // Unref'd, so a finished request never holds the process open, and
        // live while the body streams, so a stalled body is cut off too.
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (cause) {
      throw upstream(cause, `TMDB ${path} request failed`)
    }

    if (!response.ok) {
      throw new TmdbError(
        CODE_BY_STATUS[response.status] ?? 'UPSTREAM',
        `TMDB ${path} returned ${response.status}${await statusDetail(response)}`,
        { status: response.status },
      )
    }

    let body: unknown
    try {
      body = await response.json()
    } catch (cause) {
      throw upstream(
        cause,
        `TMDB ${path} returned a non-JSON body`,
        response.status,
      )
    }

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      // Kept apart from UPSTREAM: this one means TMDB changed shape, which
      // needs a code change rather than a retry.
      throw new TmdbError(
        'INVALID_RESPONSE',
        `TMDB ${path} returned an unexpected shape: ${z.prettifyError(parsed.error)}`,
        { status: response.status, cause: parsed.error },
      )
    }
    return parsed.data
  }

  return {
    async verifyAccessToken() {
      await request('/authentication', {}, accessTokenAccepted)
    },

    searchMovies(query, { page = 1 } = {}) {
      const params = { query, page, include_adult: false }
      return request('/search/movie', params, movieSearchPage)
    },

    getMovie(tmdbId) {
      return request(`/movie/${tmdbId}`, {}, movieDetails)
    },
  }
}

/** TMDB's own `status_message`, appended to the error message for the log. */
async function statusDetail(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null)
  const message = (body as { status_message?: unknown } | null)?.status_message
  return typeof message === 'string' ? `: ${message}` : ''
}
