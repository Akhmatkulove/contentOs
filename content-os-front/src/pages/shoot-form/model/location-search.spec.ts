import { locationSearchState } from './location-search'

const base = { query: 'Чилан', loading: false, failed: false, count: 0 }

describe('locationSearchState', () => {
  it('waits for two letters', () => {
    expect(locationSearchState({ ...base, query: '' })).toBe('idle')
    expect(locationSearchState({ ...base, query: ' Ч ' })).toBe('idle')
  })

  it('shows results, keeping the last list while the next one loads', () => {
    expect(locationSearchState({ ...base, count: 3 })).toBe('results')
    expect(locationSearchState({ ...base, count: 3, loading: true })).toBe('results')
  })

  it('tells loading from nothing found', () => {
    expect(locationSearchState({ ...base, loading: true })).toBe('loading')
    expect(locationSearchState(base)).toBe('empty')
  })

  it('reports a failed search even over an old list', () => {
    expect(locationSearchState({ ...base, failed: true, count: 3 })).toBe('error')
  })
})
