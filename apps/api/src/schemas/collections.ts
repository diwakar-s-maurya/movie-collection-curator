import { z } from 'zod'

import { pageNumber, pageOf, pageSize } from './common.js'

const NAME_MAX_LENGTH = 80
const DESCRIPTION_MAX_LENGTH = 500

/**
 * Trim before the length checks, so a name of nothing but spaces is rejected
 * rather than stored. Names are not unique: the id is what anything else
 * refers to.
 */
const collectionName = z
  .string()
  .trim()
  .min(1, 'Name the collection.')
  .max(NAME_MAX_LENGTH, `Names are at most ${NAME_MAX_LENGTH} characters.`)

/** An omitted field, an explicit null and a box of spaces all store null, so
 * nothing downstream tells "no description" from "an empty one". */
const collectionDescription = z
  .string()
  .trim()
  .max(
    DESCRIPTION_MAX_LENGTH,
    `Descriptions are at most ${DESCRIPTION_MAX_LENGTH} characters.`,
  )
  .nullish()
  .transform((value) => value || null)

export const createCollectionInput = z.object({
  name: collectionName,
  description: collectionDescription,
})

/** The path parameter of every by-id route, rejected here rather than by the
 * `uuid` column's cast error when a stranger sends something else. */
export const collectionIdInput = z.object({ id: z.uuid() })

/**
 * One definition of a collection, shared by the wire and the service's type.
 * `created_at` orders the list on the server and is not returned: no view
 * shows it. Stats are added to `get` and `list` in their own step.
 */
export const collection = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
})

/**
 * One page of the list. Paged rather than returned whole: the summary behind
 * each card aggregates that collection's membership rows, so an unbounded list
 * makes the cheapest-looking view the most expensive one.
 */
export const collectionsListInput = z.object({
  page: pageNumber(),
  pageSize: pageSize(),
})

export const collectionPage = pageOf(collection)
