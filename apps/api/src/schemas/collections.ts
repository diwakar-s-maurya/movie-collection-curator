import { z } from 'zod'

import { pageNumber, pageOf, pageSize } from './common.js'

import { collectionStats, summaryStats } from './stats.js'

const NAME_MAX_LENGTH = 80
const DESCRIPTION_MAX_LENGTH = 500

/** The sample collection the docs show, on the way in and on the way back. */
const NAME_EXAMPLE = 'Sunday night comfort'
const DESCRIPTION_EXAMPLE = 'Films to fall asleep to without regret.'

/**
 * Trim before the length checks, so a name of nothing but spaces is rejected
 * rather than stored — and so the uniqueness the `create` route enforces is
 * over the name as stored, not over the spaces around it.
 */
const collectionName = z
  .string()
  .trim()
  .min(1, 'Name the collection.')
  .max(NAME_MAX_LENGTH, `Names are at most ${NAME_MAX_LENGTH} characters.`)
  .meta({ examples: [NAME_EXAMPLE] })

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
  .meta({ examples: [DESCRIPTION_EXAMPLE] })

export const createCollectionInput = z.object({
  name: collectionName,
  description: collectionDescription,
})

/** One definition of a collection's id: the path parameter of every by-id
 * route, rejected here rather than by the `uuid` column's cast error when a
 * stranger sends something else, and the same id the per-movie routes nested
 * under those paths take. */
export const collectionId = z
  .uuid()
  .meta({ examples: ['b7d3c1e0-4f6a-42a8-9c15-0d8e2f7a3b64'] })

export const collectionIdInput = z.object({ id: collectionId })

/**
 * One definition of a collection, shared by the wire and the service's type.
 * `created_at` orders the list on the server and is not returned. The two
 * schemas below add the stats that `list` and `get` carry.
 */
export const collection = z.object({
  id: collectionId,
  name: z.string().meta({ examples: [NAME_EXAMPLE] }),
  description: z
    .string()
    .nullable()
    .meta({ examples: [DESCRIPTION_EXAMPLE] }),
})

/** A collection as a card on the list view. The breakdowns are left out: a
 * chip list per card is noise, and a query the list would pay for per card. */
export const collectionSummary = collection.extend({ stats: summaryStats })
/**
 * One page of the list. Paged rather than returned whole: the summary behind
 * each card aggregates that collection's membership rows, so an unbounded list
 * makes the cheapest-looking view the most expensive one.
 */
export const collectionsListInput = z.object({
  page: pageNumber(),
  pageSize: pageSize(),
})

export const collectionPage = pageOf(collectionSummary)

/** A collection on its own page: the same numbers plus the breakdowns. No
 * movies — `collectionMovies.list` pages those. */
export const collectionDetail = collection.extend({ stats: collectionStats })
