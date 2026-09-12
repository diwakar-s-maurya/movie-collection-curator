import { describe, expect, it } from 'vitest'

import { updateAnnotationInput } from './collection-movies.js'

/** The pairing every patch names; none of these cases are about it. */
const movie = {
  collectionId: '0199a0d0-0000-7000-8000-000000000000',
  tmdbId: 949,
}

function parse(patch: Record<string, unknown>) {
  return updateAnnotationInput.parse({ ...movie, ...patch })
}

describe('tags', () => {
  // The reason this suite exists: 'sci-fi ' and 'sci-fi' are one tag to a
  // reader and two to a GROUP BY, and nothing in the app would look wrong.
  it('trims, drops empties and de-duplicates in the order typed', () => {
    expect(parse({ tags: [' sci-fi ', 'noir', '', 'sci-fi', '   '] })).toEqual({
      ...movie,
      tags: ['sci-fi', 'noir'],
    })
  })

  it('keeps case, since the chips show back what was typed', () => {
    expect(parse({ tags: ['Sci-Fi', 'sci-fi'] }).tags).toEqual([
      'Sci-Fi',
      'sci-fi',
    ])
  })

  it('takes twenty tags and rejects the twenty-first', () => {
    const twenty = Array.from({ length: 20 }, (_, i) => `tag-${i}`)

    expect(parse({ tags: twenty }).tags).toEqual(twenty)
    expect(() => parse({ tags: [...twenty, 'one-too-many'] })).toThrow()
  })

  // The cap is counted after normalisation, so duplicates and blanks the user
  // never sees as chips cannot push a legitimate list over the limit.
  it('counts the cap after de-duplicating', () => {
    const tags = Array.from({ length: 30 }, () => 'noir')

    expect(parse({ tags }).tags).toEqual(['noir'])
  })

  it('clears the tags with an empty array', () => {
    expect(parse({ tags: [] }).tags).toEqual([])
  })
})

describe('rating', () => {
  it('takes whole stars from one to five, and null for unrated', () => {
    for (const rating of [1, 2, 3, 4, 5, null]) {
      expect(parse({ rating }).rating).toBe(rating)
    }
  })

  it.each([0, 6, 3.5, -1, '4'])('rejects %p', (rating) => {
    expect(() => parse({ rating })).toThrow()
  })
})

describe('note', () => {
  it('trims', () => {
    expect(parse({ note: '  Seen it twice.  ' }).note).toBe('Seen it twice.')
  })

  // Clearing the textarea and never having written a note are the same state,
  // so both store null and nothing downstream has to tell '' from absent.
  it.each(['', '   '])('stores %p as null', (note) => {
    expect(parse({ note }).note).toBeNull()
  })

  it('takes two thousand characters and rejects one more', () => {
    expect(parse({ note: 'a'.repeat(2000) }).note).toHaveLength(2000)
    expect(() => parse({ note: 'a'.repeat(2001) })).toThrow()
  })
})

describe('the patch itself', () => {
  // What makes this a patch: the sheet saves note and tags without touching
  // the rating the card set, and the card's star does not blank the note.
  it('leaves out the fields the caller did not send', () => {
    const patch = parse({ rating: 4 })

    expect(patch).toEqual({ ...movie, rating: 4 })
    expect('note' in patch).toBe(false)
    expect('tags' in patch).toBe(false)
  })

  it('clears note and rating when they are sent as null', () => {
    expect(parse({ note: null, rating: null })).toEqual({
      ...movie,
      note: null,
      rating: null,
    })
  })

  it('rejects a patch with nothing to write', () => {
    expect(() => parse({})).toThrow('at least one of note, tags or rating')
  })
})
