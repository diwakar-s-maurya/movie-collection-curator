/**
 * The annotation rules the API applies, restated on this side. Both editors
 * write optimistically, so the copy patched into the cache has to be the copy
 * the server stored. The limits are here for the same reason: the editor stops
 * the user rather than sending a write already known to be rejected.
 */
export const NOTE_MAX_LENGTH = 2000
export const TAGS_MAX = 20

/** Trimmed, and a box holding nothing is null: "no note" is one value here as
 * well as in the column. */
export function normaliseNote(note: string | null): string | null {
  return note?.trim() || null
}

/** Trimmed, blanks dropped, de-duplicated, in the order they were typed. Case
 * is left alone — 'Sci-Fi' is how the user wrote it. */
export function normaliseTags(tags: readonly string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))]
}

/** Whether two tag lists say the same thing, for the editor's unsaved check.
 * Order counts: moving a chip is an edit. */
export function sameTags(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((tag, index) => tag === b[index])
}
