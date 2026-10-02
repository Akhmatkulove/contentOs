import { deliveryPercent } from './product'

describe('deliveryPercent', () => {
  it('rounds to a whole percent', () => {
    expect(deliveryPercent({ done: 6, total: 8 })).toBe(75)
    expect(deliveryPercent({ done: 7, total: 8 })).toBe(88)
  })

  it('is 0 when nothing is planned yet', () => {
    expect(deliveryPercent({ done: 0, total: 0 })).toBe(0)
  })

  it('never goes past 100', () => {
    expect(deliveryPercent({ done: 9, total: 8 })).toBe(100)
  })
})
