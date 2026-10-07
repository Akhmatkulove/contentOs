import { ALL, defaultFilters, filterOptions, filterParams } from './reference-filters'

describe('filterOptions', () => {
  it('starts every list with "All …" and keeps creator photos', () => {
    const options = filterOptions({
      products: [{ id: 'p1', name: 'Black Abaya 042' }],
      authors: [{ id: 'u1', name: null, photo_url: '/acme.webp' }],
      tags: ['pose'],
    })
    expect(options.products).toEqual([
      { value: ALL, label: 'All products' },
      { value: 'p1', label: 'Black Abaya 042' },
    ])
    expect(options.creators).toEqual([
      { value: ALL, label: 'All creators', photoUrl: null },
      { value: 'u1', label: 'Unnamed', photoUrl: '/acme.webp' },
    ])
    expect(options.tags).toEqual([
      { value: ALL, label: 'All tags' },
      { value: 'pose', label: 'pose' },
    ])
  })

  it('offers only "All …" before the options load', () => {
    expect(filterOptions(undefined).products).toEqual([{ value: ALL, label: 'All products' }])
  })
})

describe('filterParams', () => {
  it('sends nothing for "All …"', () => {
    expect(filterParams(defaultFilters)).toEqual({
      type: undefined,
      productId: undefined,
      authorId: undefined,
      tag: undefined,
      sort: 'newest',
    })
  })

  it('sends the picked values', () => {
    expect(
      filterParams({ type: 'video', productId: 'p1', authorId: 'u1', tag: 'pose', sort: 'oldest' }),
    ).toEqual({ type: 'video', productId: 'p1', authorId: 'u1', tag: 'pose', sort: 'oldest' })
  })
})
