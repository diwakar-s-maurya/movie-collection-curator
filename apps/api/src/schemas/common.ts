import { z } from 'zod'

/**
 * `.meta({ examples: [...] })` on any schema below reaches the OpenAPI document:
 * oRPC's Zod converter forwards `examples` from the global registry `.meta()`
 * writes to, and the docs page builds its sample bodies out of them.
 *
 * This declaration is what types them — `$output` stands for "this schema's
 * output type", so an example cannot drift from the field it illustrates. Zod's
 * metadata is open, so removing it does not fail here: every example silently
 * goes unchecked instead.
 */
declare module 'zod' {
  interface GlobalMeta {
    examples?: z.core.$output[]
  }
}

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
    page: z
      .number()
      .int()
      .meta({ examples: [1] }),
    totalPages: z
      .number()
      .int()
      .meta({ examples: [3] }),
    totalResults: z
      .number()
      .int()
      .meta({ examples: [57] }),
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
