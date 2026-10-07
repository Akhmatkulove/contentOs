import { defaultFilters } from '@/entities/reference'
import { isFiltered } from './reference-filters'

describe('isFiltered', () => {
  it('ignores the sort', () => {
    expect(isFiltered({ ...defaultFilters, sort: 'title_asc' })).toBe(false)
    expect(isFiltered({ ...defaultFilters, tag: 'pose' })).toBe(true)
  })
})
