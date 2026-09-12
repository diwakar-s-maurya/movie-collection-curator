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

/**
 * Which page to be on after removing a row: one step back when the row was the
 * last on a page that is not the first. Without this the user is left looking
 * at a page that no longer exists.
 */
export function pageAfterRemoval(rowsOnPage: number | undefined, page: number) {
  return rowsOnPage === 1 && page > FIRST_PAGE ? page - 1 : page
}
