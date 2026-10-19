import { badgeLabel } from './badge'

describe('badgeLabel', () => {
  it('hides zero and caps big numbers', () => {
    expect([badgeLabel(0), badgeLabel(7), badgeLabel(100)]).toEqual([undefined, '7', '99+'])
  })
})
