import { z } from 'zod'

/** The output of a procedure whose whole answer is "it worked". A body rather
 * than a bare 204, so every response is parsed the same way. */
export const ok = z.object({ ok: z.literal(true) })

/**
 * One page of a list, whatever it holds, so a paging control does not care
 * which procedure filled it. The field names are TMDB's, since one of the
 * three pages is TMDB's.
 */
export function pageOf<Item extends z.ZodType>(item: Item) {
  return z.object({
    page: z.number().int(),
    totalPages: z.number().int(),
    totalResults: z.number().int(),
    results: z.array(item),
  })
}

const PAGE_SIZE_DEFAULT = 24
const PAGE_SIZE_MAX = 100

/** How many rows a page holds. Shared by both lists, so a hand-written request
 * cannot ask either of them for everything at once. */
export function pageSize() {
  return z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGE_SIZE_MAX)
    .default(PAGE_SIZE_DEFAULT)
}

/**
 * A 1-based page number, coerced because paging arrives in the query string as
 * a string. `max` is for a list whose source stops paging — TMDB's search does,
 * at 500; a list of our own rows does not.
 */
export function pageNumber(max?: number) {
  const page = z.coerce.number().int().min(1)

  return (max === undefined ? page : page.max(max)).default(1)
}
