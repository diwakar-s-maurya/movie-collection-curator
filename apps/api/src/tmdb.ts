import { createTmdbClient, type TmdbClient, TmdbError } from '@curator/tmdb'

/**
 * Takes the environment's values rather than reading them, so the failure names
 * the variable to fix. A missing token is fatal, the way a missing
 * DATABASE_URL is: search and add are most of the app.
 */
export function createTmdb(env: {
  accessToken: string | undefined
  /** Unset leaves the library's own deadline in place. */
  timeoutMs: string | undefined
}): TmdbClient {
  if (!env.accessToken) {
    throw new Error(
      'createTmdb: TMDB_ACCESS_TOKEN is not set. Copy .env.example to .env and put your v4 read access token in it.',
    )
  }

  return createTmdbClient({
    accessToken: env.accessToken,
    timeoutMs: env.timeoutMs ? Number(env.timeoutMs) : undefined,
  })
}

/**
 * Logs whether TMDB accepts the token. Never throws and never gates serving: a
 * rejected token belongs in the log rather than in a user's first search, but
 * TMDB being slow or down is not a reason to refuse to start.
 */
export async function reportAccessToken(tmdb: TmdbClient): Promise<void> {
  try {
    await tmdb.verifyAccessToken()
    console.log('[tmdb] access token accepted')
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    if (error instanceof TmdbError && error.code === 'UNAUTHORIZED') {
      // Our config, not a user's request: say what stops working and why.
      console.error(
        `[tmdb] access token rejected, so movie search and add will fail until TMDB_ACCESS_TOKEN is fixed — ${detail}`,
      )
    } else {
      console.warn(`[tmdb] could not check the access token — ${detail}`)
    }
  }
}
