import { queryForScope, referenceTabs, scopeFromQuery } from './reference-tabs'

describe('reference tabs', () => {
  it('reads the tab from the URL, all references by default', () => {
    expect(scopeFromQuery({ tab: 'favorites' })).toBe('favorites')
    expect(scopeFromQuery({})).toBe('all')
    expect(scopeFromQuery({ tab: 'mine' })).toBe('all')
    expect(scopeFromQuery({ tab: ['favorites'] })).toBe('all')
  })

  it('writes the tab to the URL and keeps the rest of the query', () => {
    expect(queryForScope({ q: 'x' }, 'favorites')).toEqual({ q: 'x', tab: 'favorites' })
    expect(queryForScope({ q: 'x', tab: 'favorites' }, 'all')).toEqual({ q: 'x' })
  })

  it('labels the tabs with their counts', () => {
    expect(referenceTabs({ all: 12, favorites: 3 })).toEqual([
      { value: 'all', label: 'All references', count: 12 },
      { value: 'favorites', label: 'Favorites', count: 3 },
    ])
    expect(referenceTabs(undefined).map((tab) => tab.count)).toEqual([0, 0])
  })
})
