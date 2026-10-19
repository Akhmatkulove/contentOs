import { referenceKeys } from './reference-keys'

// Invalidating a key refreshes every key that starts with it.
const under = (key: readonly unknown[], prefix: readonly unknown[]) =>
  prefix.every((part, index) => key[index] === part)

describe('referenceKeys', () => {
  it('refreshes the page and the reference bank together', () => {
    expect(under(referenceKeys.list({ page: 1 }), referenceKeys.lists)).toBe(true)
    expect(under(referenceKeys.picker({ search: '' }), referenceKeys.lists)).toBe(true)
    expect(under(referenceKeys.collections({ page: 1 }), referenceKeys.lists)).toBe(true)
  })

  it('leaves the filter options alone when only lists refresh', () => {
    expect(under(referenceKeys.filters, referenceKeys.lists)).toBe(false)
    expect(under(referenceKeys.filters, referenceKeys.all)).toBe(true)
  })
})
