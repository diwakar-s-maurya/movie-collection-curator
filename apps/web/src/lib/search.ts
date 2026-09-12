import {
  type SearchSchemaInput,
  stripSearchParams,
} from '@tanstack/react-router'

const FIRST_PAGE = 1

type PageSearch = { page: number }

/**
 * `?page=` as both paginated views read it. Page number is the one piece of UI
 * state the router owns, so it survives a refresh and can be linked to.
 * Anything that is not a positive whole number reads as page 1 rather than
 * failing the route.
 *
 * `SearchSchemaInput` tells the router that the parsed shape and the shape a
 * caller supplies differ: without it, every `Link` would have to name a page.
 */
export function validatePageSearch(
  search: { page?: unknown } & SearchSchemaInput,
): PageSearch {
  const page = Number(search.page)

  return { page: Number.isInteger(page) && page > 0 ? page : FIRST_PAGE }
}

/** Keeps `?page=1` out of the address bar: the validator always parses a page,
 * which would otherwise put the default in every URL the router writes. */
export const pageSearchMiddleware = [
  stripSearchParams<PageSearch>({ page: FIRST_PAGE }),
]
