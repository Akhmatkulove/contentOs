import { nextPage } from './paging'

describe('nextPage', () => {
  it('asks for the next page while items remain', () => {
    expect(nextPage(31, 1, 30)).toBe(2)
    expect(nextPage(61, 2, 30)).toBe(3)
  })

  it('stops once every item is loaded', () => {
    expect(nextPage(30, 1, 30)).toBeNull()
    expect(nextPage(0, 1, 30)).toBeNull()
  })
})
