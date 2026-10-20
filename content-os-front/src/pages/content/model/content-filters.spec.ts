import {
  ALL,
  activeFilterCount,
  appliedScope,
  contentTabs,
  filterOptions,
  filterParams,
  foundLabel,
  isFiltered,
  type ContentFilters,
} from './content-filters'

const none: ContentFilters = {
  productId: ALL,
  shootId: ALL,
  authorId: ALL,
  status: ALL,
  sort: 'newest',
}

describe('content filters', () => {
  it('counts the search and each filter, not the sort', () => {
    expect(isFiltered({ ...none, sort: 'oldest' })).toBe(false)
    expect(isFiltered({ ...none, status: 'new' })).toBe(true)
    expect(activeFilterCount({ ...none, shootId: 's1', authorId: 'u1' }, 'walk')).toBe(3)
  })

  it('sends nothing for "All …"', () => {
    expect(filterParams({ ...none, productId: 'p1', status: 'approved' })).toEqual({
      productId: 'p1',
      shootId: undefined,
      authorId: undefined,
      status: 'approved',
      sort: 'newest',
    })
  })

  it('starts every option list with "All …"', () => {
    const options = filterOptions({
      products: [{ id: 'p1', name: 'Dress' }],
      shoots: [],
      creators: [{ id: 'u1', name: null, photo_url: null }],
    })
    expect(options.products.map((option) => option.label)).toEqual(['All products', 'Dress'])
    expect(options.shoots).toEqual([{ value: ALL, label: 'All shoots' }])
    expect(options.creators[1]).toEqual({ value: 'u1', label: 'Unnamed', photoUrl: null })
  })

  it('labels the tabs and the found count', () => {
    expect(contentTabs({ all: 3, mine: 1, favorites: 2 }, false).map((tab) => tab.count)).toEqual([
      3, 1,
    ])
    expect(contentTabs(undefined, false).map((tab) => tab.label)).toEqual([
      'All content',
      'My content',
    ])
    // Favorites only for the brand.
    expect(contentTabs({ all: 3, mine: 3, favorites: 2 }, true).map((tab) => tab.count)).toEqual([
      3, 3, 2,
    ])
    expect(appliedScope('favorites', false)).toBe('all')
    expect(appliedScope('favorites', true)).toBe('favorites')
    expect([foundLabel(1), foundLabel(2)]).toEqual(['1 file', '2 files'])
  })
})
