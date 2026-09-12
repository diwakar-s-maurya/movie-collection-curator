import { describe, expect, it } from 'vitest'

import { createTmdbClient, type FetchLike } from './client.js'
import { TmdbError } from './errors.js'
import { posterUrl } from './images.js'

const ACCESS_TOKEN = 'test-token'
const BASE_URL = 'https://tmdb.test/3'

type Call = { url: URL; init: RequestInit | undefined }

/**
 * A client whose `fetch` answers from `responder` and records what it was
 * asked, so a test can assert on the response mapping, the request, or both.
 */
function clientReturning(
  responder: () => Response | Promise<Response>,
  options: { language?: string; timeoutMs?: number } = {},
) {
  const calls: Call[] = []
  const fetch: FetchLike = (input, init) => {
    const url = new URL(input)
    calls.push({ url, init })
    return Promise.resolve(responder())
  }
  const client = createTmdbClient({
    accessToken: ACCESS_TOKEN,
    baseUrl: BASE_URL,
    fetch,
    ...options,
  })
  return { client, calls }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** Asserts the call rejected with a TmdbError, and returns it for inspection. */
async function rejection(promise: Promise<unknown>): Promise<TmdbError> {
  const thrown = await promise.then(
    () => null,
    (error: unknown) => error,
  )
  expect(thrown).toBeInstanceOf(TmdbError)
  return thrown as TmdbError
}

/** What Node rejects a fetch or a body read with once the deadline passes. */
function timeoutError(): DOMException {
  return new DOMException('aborted due to timeout', 'TimeoutError')
}

const godfather = {
  id: 238,
  title: 'The Godfather',
  overview: 'Spanning the years 1945 to 1955.',
  poster_path: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
  release_date: '1972-03-14',
  vote_average: 8.7,
  // Fields the DTO drops. Here so a schema that grew `.strict()` fails loudly.
  adult: false,
  popularity: 123.4,
  genre_ids: [18, 80],
}

const searchBody = {
  page: 1,
  total_pages: 2,
  total_results: 24,
  results: [
    godfather,
    // The quirks, in one row: no date, no overview, no poster.
    {
      id: 999,
      title: 'Untitled',
      overview: null,
      poster_path: null,
      release_date: '',
      vote_average: 0,
    },
  ],
}

/** What `godfather` must come back as once mapped. */
const godfatherDto = {
  tmdbId: 238,
  title: 'The Godfather',
  overview: 'Spanning the years 1945 to 1955.',
  posterPath: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
  releaseDate: '1972-03-14',
  voteAverage: 8.7,
}

const detailsBody = {
  ...godfather,
  runtime: 175,
  genres: [
    { id: 18, name: 'Drama' },
    { id: 80, name: 'Crime' },
  ],
}

describe('createTmdbClient', () => {
  it('refuses to build without an access token', () => {
    expect(() => createTmdbClient({ accessToken: '' })).toThrow(/accessToken/)
  })
})

describe('searchMovies', () => {
  it('maps TMDB results onto the library DTO', async () => {
    const { client } = clientReturning(() => jsonResponse(searchBody))

    const page = await client.searchMovies('godfather')

    expect(page).toEqual({
      page: 1,
      totalPages: 2,
      totalResults: 24,
      results: [
        godfatherDto,
        {
          tmdbId: 999,
          title: 'Untitled',
          overview: '',
          posterPath: null,
          releaseDate: null,
          voteAverage: 0,
        },
      ],
    })
  })

  it('sends the auth header, the encoded query and include_adult=false', async () => {
    const { client, calls } = clientReturning(() => jsonResponse(searchBody))

    await client.searchMovies('amelie & co', { page: 3 })

    expect(calls).toHaveLength(1)
    const call = calls[0]
    expect(call?.url.pathname).toBe('/3/search/movie')
    expect(call?.init?.headers).toMatchObject({
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    })
    expect(call?.url.searchParams.get('query')).toBe('amelie & co')
    // The reserved character must not reach the query string raw.
    expect(call?.url.search).toContain('%26')
    expect(call?.url.searchParams.get('page')).toBe('3')
    expect(call?.url.searchParams.get('include_adult')).toBe('false')
    expect(call?.url.searchParams.get('language')).toBe('en-US')
    expect(call?.init?.signal).toBeInstanceOf(AbortSignal)
  })

  it('defaults to page 1 and takes the language from the client', async () => {
    const { client, calls } = clientReturning(() => jsonResponse(searchBody), {
      language: 'fr-FR',
    })

    await client.searchMovies('godfather')

    expect(calls[0]?.url.searchParams.get('page')).toBe('1')
    expect(calls[0]?.url.searchParams.get('language')).toBe('fr-FR')
  })
})

describe('verifyAccessToken', () => {
  it('resolves when TMDB accepts the token', async () => {
    const { client, calls } = clientReturning(() =>
      jsonResponse({ success: true }),
    )

    await expect(client.verifyAccessToken()).resolves.toBeUndefined()

    expect(calls[0]?.url.pathname).toBe('/3/authentication')
  })

  it('does not take a 200 saying success is false as a good token', async () => {
    const { client } = clientReturning(() => jsonResponse({ success: false }))

    const error = await rejection(client.verifyAccessToken())

    expect(error.code).toBe('INVALID_RESPONSE')
  })
})

describe('getMovie', () => {
  // The fields details shares with a search hit go through the same mapper,
  // so this covers only what details adds on top.
  it('adds runtime and named genres', async () => {
    const { client, calls } = clientReturning(() => jsonResponse(detailsBody))

    const movie = await client.getMovie(238)

    expect(calls[0]?.url.pathname).toBe('/3/movie/238')
    expect(movie).toMatchObject({
      runtime: 175,
      genres: [
        { id: 18, name: 'Drama' },
        { id: 80, name: 'Crime' },
      ],
    })
  })

  it('treats a runtime of 0 as unknown', async () => {
    const { client } = clientReturning(() =>
      jsonResponse({ ...detailsBody, runtime: 0 }),
    )

    await expect(client.getMovie(238)).resolves.toMatchObject({ runtime: null })
  })
})

describe('error mapping', () => {
  it.each([
    [404, 'NOT_FOUND'],
    [429, 'RATE_LIMITED'],
    [401, 'UNAUTHORIZED'],
    [500, 'UPSTREAM'],
  ])('maps HTTP %i to %s', async (status, code) => {
    const { client } = clientReturning(() =>
      jsonResponse({ status_code: 34, status_message: 'nope' }, status),
    )

    const error = await rejection(client.getMovie(238))

    expect(error.code).toBe(code)
    expect(error.status).toBe(status)
    // TMDB's own message is kept for the log.
    expect(error.message).toContain('nope')
  })

  it('maps a timeout to UPSTREAM, naming the deadline', async () => {
    const { client } = clientReturning(() => Promise.reject(timeoutError()), {
      timeoutMs: 250,
    })

    const error = await rejection(client.searchMovies('godfather'))

    expect(error.code).toBe('UPSTREAM')
    expect(error.message).toContain('timed out after 250ms')
  })

  it('reports a timeout mid-body as a timeout, not a bad body', async () => {
    const { client } = clientReturning(
      () =>
        new Response(
          new ReadableStream({
            start: (controller) => controller.error(timeoutError()),
          }),
          { headers: { 'content-type': 'application/json' } },
        ),
      { timeoutMs: 250 },
    )

    const error = await rejection(client.searchMovies('godfather'))

    expect(error.code).toBe('UPSTREAM')
    expect(error.message).toContain('timed out after 250ms')
  })

  it('maps a network failure to UPSTREAM', async () => {
    const { client } = clientReturning(() =>
      Promise.reject(new Error('ECONNREFUSED')),
    )

    const error = await rejection(client.searchMovies('godfather'))

    expect(error.code).toBe('UPSTREAM')
    expect(error.status).toBeUndefined()
    expect(error.cause).toMatchObject({ message: 'ECONNREFUSED' })
  })

  it('maps a 200 with a body that is not JSON to UPSTREAM', async () => {
    const { client } = clientReturning(
      () => new Response('<html>maintenance</html>', { status: 200 }),
    )

    const error = await rejection(client.searchMovies('godfather'))

    expect(error.code).toBe('UPSTREAM')
    expect(error.status).toBe(200)
  })

  it('maps a 200 missing results to INVALID_RESPONSE', async () => {
    const { results: _results, ...withoutResults } = searchBody
    const { client } = clientReturning(() => jsonResponse(withoutResults))

    const error = await rejection(client.searchMovies('godfather'))

    expect(error.code).toBe('INVALID_RESPONSE')
    expect(error.message).toContain('results')
  })
})

describe('posterUrl', () => {
  it('builds a CDN url at the requested size', () => {
    expect(posterUrl('/abc.jpg')).toBe(
      'https://image.tmdb.org/t/p/w342/abc.jpg',
    )
    expect(posterUrl('/abc.jpg', 'w500')).toBe(
      'https://image.tmdb.org/t/p/w500/abc.jpg',
    )
  })

  it('is null when there is no poster', () => {
    expect(posterUrl(null)).toBeNull()
  })
})
