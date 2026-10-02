import { grabberGesture, SWIPE_CLOSE_DISTANCE, TAP_SLOP } from './grabber-gesture'

describe('grabberGesture', () => {
  it('treats a small jitter in either direction as a tap', () => {
    expect(grabberGesture(0)).toBe('tap')
    expect(grabberGesture(TAP_SLOP - 1)).toBe('tap')
    expect(grabberGesture(-(TAP_SLOP - 1))).toBe('tap')
  })

  it('closes on a pull down past the distance', () => {
    expect(grabberGesture(SWIPE_CLOSE_DISTANCE)).toBe('swipe-down')
    expect(grabberGesture(200)).toBe('swipe-down')
  })

  it('ignores a short pull down and any pull up', () => {
    expect(grabberGesture(SWIPE_CLOSE_DISTANCE - 1)).toBe('none')
    expect(grabberGesture(-SWIPE_CLOSE_DISTANCE)).toBe('none')
  })
})
