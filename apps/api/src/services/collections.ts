import type { z } from 'zod'
import { db } from '../db.js'

import type {
  collection,
  collectionDetail,
  collectionPage,
  collectionsListInput,
  createCollectionInput,
} from '../schemas/collections.js'
import { statsFor, withSummaries } from './stats.js'

export type Collection = z.infer<typeof collection>
export type CollectionPage = z.infer<typeof collectionPage>
export type CollectionDetail = z.infer<typeof collectionDetail>

/** Kept beside the type so a new field is one edit, not one per query. */
const collectionSelect = { id: true, name: true, description: true } as const

/**
 * Every function here takes the owner's id and puts it in the `where`, so
 * someone else's collection is indistinguishable from one that does not exist:
 * the API has no `FORBIDDEN` and never confirms a stranger's ids.
 */
export async function listCollections(
  userId: string,
  input: z.infer<typeof collectionsListInput>,
): Promise<CollectionPage> {
  const { page, pageSize } = input

  // One round trip: neither needs the other's answer.
  const [totalResults, collections] = await Promise.all([
    db.collection.count({ where: { userId } }),
    db.collection.findMany({
      where: { userId },
      // Newest first, off the (user_id, created_at) index. Ids are uuidv7 and
      // so time-ordered too, keeping the order stable within a millisecond.
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: collectionSelect,
    }),
  ])

  return {
    page,
    totalPages: Math.ceil(totalResults / pageSize),
    totalResults,
    // Scoped above, so the stats module takes these rows as they are. Only
    // this page is summarised, not the whole list.
    results: await withSummaries(collections),
  }
}

/** The user's collection with this id and its stats, or null when they have
 * no such row. */
export async function findCollection(
  userId: string,
  id: string,
): Promise<CollectionDetail | null> {
  const found = await db.collection.findFirst({
    where: { id, userId },
    select: collectionSelect,
  })
  if (!found) return null

  // After the ownership check rather than beside it, so a stranger's id costs
  // one indexed read and no aggregation.
  return { ...found, stats: await statsFor(id) }
}

export function createCollection(
  userId: string,
  input: z.infer<typeof createCollectionInput>,
): Promise<Collection> {
  return db.collection.create({
    data: { ...input, userId },
    select: collectionSelect,
  })
}

/**
 * Deletes the user's collection with this id, and reports whether there was
 * one. `deleteMany` rather than `delete` so the ownership check and the delete
 * are one statement, with no read to race with. Memberships go by cascade; the
 * `movies` snapshot rows stay, being a cache every collection shares.
 */
export async function deleteCollection(
  userId: string,
  id: string,
): Promise<boolean> {
  const { count } = await db.collection.deleteMany({ where: { id, userId } })

  return count > 0
}
