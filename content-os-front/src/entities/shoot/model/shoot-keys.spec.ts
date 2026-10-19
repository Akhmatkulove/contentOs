import { shootKeys } from './shoot-keys'

// Invalidating a key refreshes every key that starts with it.
const under = (key: readonly unknown[], prefix: readonly unknown[]) =>
  prefix.every((part, index) => key[index] === part)

describe('shootKeys', () => {
  it('puts every list-shaped entry under lists', () => {
    expect(under(shootKeys.list({ page: 1 }), shootKeys.lists)).toBe(true)
    expect(under(shootKeys.next, shootKeys.lists)).toBe(true)
    expect(under(shootKeys.overview('last_6_months'), shootKeys.lists)).toBe(true)
    expect(under(shootKeys.productDeliverables(['p1']), shootKeys.lists)).toBe(true)
  })

  it('keeps a saved shoot and its notes out of lists', () => {
    expect(under(shootKeys.detail('s1'), shootKeys.lists)).toBe(false)
    expect(under(shootKeys.notes('s1'), shootKeys.lists)).toBe(false)
    expect(under(shootKeys.notes('s1'), shootKeys.detail('s1'))).toBe(true)
  })
})
