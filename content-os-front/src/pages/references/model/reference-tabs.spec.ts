import { referenceTabs } from './reference-tabs'

describe('reference tabs', () => {
  it('labels the tabs with their counts', () => {
    expect(referenceTabs({ all: 12, favorites: 3 })).toEqual([
      { value: 'all', label: 'All references', count: 12 },
      { value: 'favorites', label: 'Favorites', count: 3 },
    ])
    expect(referenceTabs(undefined).map((tab) => tab.count)).toEqual([0, 0])
  })
})
