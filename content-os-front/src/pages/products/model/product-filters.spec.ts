import {
  activeFilterCount,
  collectionOptions,
  defaultFilters,
  filterParams,
  isFiltered,
} from './product-filters'

describe('product filters', () => {
  it('start with every collection and status, newest first', () => {
    expect(filterParams(defaultFilters)).toEqual({
      collection: undefined,
      status: undefined,
      sort: 'newest',
    })
    expect(isFiltered(defaultFilters)).toBe(false)
  })

  it('send the picked collection and status', () => {
    const filters = { collection: 'Autumn 26', status: 'archived', sort: 'name_asc' } as const
    expect(filterParams(filters)).toEqual({
      collection: 'Autumn 26',
      status: 'archived',
      sort: 'name_asc',
    })
    expect(isFiltered(filters)).toBe(true)
    // The sort alone doesn't narrow the list.
    expect(isFiltered({ ...defaultFilters, sort: 'oldest' })).toBe(false)
  })

  it('offer "All collections" first, then the collections', () => {
    expect(collectionOptions({ collections: ['Autumn 26'] })).toEqual([
      { value: 'all', label: 'All collections' },
      { value: 'Autumn 26', label: 'Autumn 26' },
    ])
  })

  it('count the search and each filter, not the sort', () => {
    expect(activeFilterCount({ ...defaultFilters, sort: 'oldest' }, '')).toBe(0)
    expect(activeFilterCount({ ...defaultFilters, status: 'archived' }, 'linen')).toBe(2)
  })
})
