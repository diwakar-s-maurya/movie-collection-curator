import {
  deleteCookie,
  getCookie,
  type SetCookieOptions,
  setCookie,
} from '@orpc/server/helpers'

const USER_COOKIE = 'curator_uid'

/** A month, in the seconds `Max-Age` is counted in. The cookie is the whole
 * session, so this is how long a browser stays signed in. */
const COOKIE_MAX_AGE_S = 30 * 24 * 60 * 60

/**
 * Not `secure`, because the demo runs on http://localhost. The value is the
 * user id in the clear — unsigned and trivially forged (README decision 7).
 * Shared by the set and the clear, since a cookie is only deleted by a
 * `Set-Cookie` matching the one that created it.
 */
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
} as const satisfies SetCookieOptions

export function setUserCookie(headers: Headers | undefined, id: string): void {
  setCookie(headers, USER_COOKIE, id, {
    ...COOKIE_OPTIONS,
    maxAge: COOKIE_MAX_AGE_S,
  })
}

export function clearUserCookie(headers: Headers | undefined): void {
  deleteCookie(headers, USER_COOKIE, COOKIE_OPTIONS)
}

/**
 * The user id a request claims to be, straight off the cookie and believed
 * only as far as the lookup that follows it — anyone can put any id here.
 */
export function readUserId(headers: Headers | undefined): string | undefined {
  return getCookie(headers, USER_COOKIE)
}
