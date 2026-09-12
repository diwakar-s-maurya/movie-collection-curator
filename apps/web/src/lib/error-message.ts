import { fallbackORPCErrorMessage, ORPCError } from '@orpc/client'

/** The request never produced an answer: the API is down, the dev proxy has
 * nothing behind it, or the browser is offline. `fetch` rejects with a
 * `TypeError` for all three. */
const UNREACHABLE =
  'Could not reach the server. Check your connection, then try again.'

/** Nobody wrote a message for this one: an unhandled throw on the server,
 * which oRPC sanitises, or a status with no body it recognises. */
const UNEXPECTED = 'Something went wrong on the server. Try again in a moment.'

/**
 * What a failure says to the user. Every message this API raises is already a
 * sentence about what happened, so the job here is to catch the two kinds that
 * are not: the transport failing before anything answered, and the status
 * phrase oRPC fills in when no message came back.
 *
 * One place, because every failure is shown through `ErrorText` or a toast.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof ORPCError) {
    // Case-insensitively: oRPC writes the status phrase in title case and its
    // sanitised message for a server-side throw in sentence case.
    const filledIn = fallbackORPCErrorMessage(error.code, '')

    return error.message.toLowerCase() === filledIn.toLowerCase()
      ? UNEXPECTED
      : error.message
  }

  return error instanceof TypeError ? UNREACHABLE : UNEXPECTED
}
