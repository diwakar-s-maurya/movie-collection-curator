/** Why a TMDB call failed, in terms the API layer can act on. The split exists
 * so "TMDB changed shape" and "TMDB is down" are not the same incident. */
export type TmdbErrorCode =
  /** The movie id does not exist upstream. */
  | 'NOT_FOUND'
  /** Too many requests. The client does not retry. */
  | 'RATE_LIMITED'
  /** Our access token is missing, wrong or suspended: a config bug. */
  | 'UNAUTHORIZED'
  /** 2xx whose body failed the response schema. */
  | 'INVALID_RESPONSE'
  /** Everything else: other non-2xx, network failure, non-JSON body, timeout. */
  | 'UPSTREAM'

/** Every rejected TMDB call fails with one of these. */
export class TmdbError extends Error {
  readonly code: TmdbErrorCode
  /** HTTP status, absent when the request never produced a response. */
  readonly status: number | undefined

  constructor(
    code: TmdbErrorCode,
    message: string,
    options: { status?: number; cause?: unknown },
  ) {
    super(message, { cause: options.cause })
    this.name = 'TmdbError'
    this.code = code
    this.status = options.status
  }
}
