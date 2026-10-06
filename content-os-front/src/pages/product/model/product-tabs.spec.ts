import { queryForTab, tabFromQuery } from './product-tabs'

describe('product tabs in the URL', () => {
  it('reads the tab, falling back to Overview', () => {
    expect(tabFromQuery({ tab: 'deliverables' })).toBe('deliverables')
    expect(tabFromQuery({ tab: 'nope' })).toBe('overview')
    expect(tabFromQuery({})).toBe('overview')
  })

  it('keeps Overview out of the URL and the rest of the query as is', () => {
    expect(queryForTab({ tab: 'references', x: '1' }, 'overview')).toEqual({ x: '1' })
    expect(queryForTab({ x: '1' }, 'content')).toEqual({ x: '1', tab: 'content' })
  })
})
