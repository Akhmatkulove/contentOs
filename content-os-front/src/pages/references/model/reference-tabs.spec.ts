import { referenceTabs } from './reference-tabs'

describe('reference tabs', () => {
  it('labels the tabs with their counts', () => {
    expect(referenceTabs({ all: 12, mine: 5, favorites: 3, collections: 2 })).toEqual([
      { value: 'all', label: 'All references', count: 12 },
      { value: 'mine', label: 'My references', count: 5 },
      { value: 'favorites', label: 'Favorites', count: 3 },
      { value: 'collections', label: 'Collections', count: 2 },
    ])
    expect(referenceTabs(undefined).map((tab) => tab.count)).toEqual([0, 0, 0, 0])
  })
})
