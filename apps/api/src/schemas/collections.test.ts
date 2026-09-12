import { describe, expect, it } from 'vitest'

import { createCollectionInput } from './collections.js'

/**
 * The procedure is the only thing that parses this, so what it normalises is
 * what reaches the column — the service stores what it is handed and checks
 * nothing a second time.
 */
describe('the name', () => {
  it('trims', () => {
    expect(createCollectionInput.parse({ name: '  Noir  ' }).name).toBe('Noir')
  })

  // Trimmed before the length checks, so a box of spaces is rejected rather
  // than stored as a collection with a blank name.
  it.each(['', '   '])('rejects %p', (name) => {
    expect(() => createCollectionInput.parse({ name })).toThrow()
  })

  it('takes eighty characters and rejects one more', () => {
    const name = 'a'.repeat(80)

    expect(createCollectionInput.parse({ name }).name).toHaveLength(80)
    expect(() => createCollectionInput.parse({ name: `${name}a` })).toThrow()
  })
})

describe('the description', () => {
  // An omitted description, an explicit null and a box of spaces are one thing
  // by the time they reach the column, so nothing downstream tells them apart.
  it.each([undefined, null, '', '   '])('stores %p as null', (description) => {
    expect(
      createCollectionInput.parse({ name: 'Noir', description }).description,
    ).toBeNull()
  })

  it('trims what it keeps', () => {
    expect(
      createCollectionInput.parse({ name: 'Noir', description: '  Rain.  ' })
        .description,
    ).toBe('Rain.')
  })

  it('takes five hundred characters and rejects one more', () => {
    const description = 'a'.repeat(500)

    expect(
      createCollectionInput.parse({ name: 'Noir', description }).description,
    ).toHaveLength(500)
    expect(() =>
      createCollectionInput.parse({
        name: 'Noir',
        description: `${description}a`,
      }),
    ).toThrow()
  })
})
