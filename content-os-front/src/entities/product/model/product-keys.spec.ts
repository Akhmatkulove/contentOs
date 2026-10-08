import { productKeys } from './product-keys'

// Invalidating a key refreshes every key that starts with it.
const under = (key: readonly unknown[], prefix: readonly unknown[]) =>
  prefix.every((part, index) => key[index] === part)

describe('productKeys', () => {
  it('puts every list-shaped entry under lists', () => {
    expect(under(productKeys.list({ page: 1 }), productKeys.lists)).toBe(true)
    expect(under(productKeys.picker(''), productKeys.lists)).toBe(true)
    expect(under(productKeys.filters, productKeys.lists)).toBe(true)
    expect(under(productKeys.options, productKeys.lists)).toBe(true)
  })

  it('keeps a saved product out of lists', () => {
    expect(under(productKeys.detail('p1'), productKeys.lists)).toBe(false)
    expect(under(productKeys.detail('p1'), productKeys.all)).toBe(true)
  })
})
