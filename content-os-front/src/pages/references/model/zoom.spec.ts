import {
  clampView,
  FIT,
  maxScale,
  pinchView,
  swipeGesture,
  tapScale,
  wheelScale,
  zoomAt,
} from './zoom'

const fit = { width: 400, height: 300 }
const stage = { width: 800, height: 600 }

describe('maxScale and tapScale', () => {
  it('reach the original pixels of a large image', () => {
    expect(maxScale({ width: 4000, height: 3000 }, fit)).toBe(10)
    expect(tapScale({ width: 4000, height: 3000 }, fit)).toBe(4)
    expect(tapScale({ width: 1200, height: 900 }, fit)).toBe(3)
  })

  it('still zoom a small image', () => {
    expect(maxScale({ width: 400, height: 300 }, fit)).toBe(4)
    expect(tapScale({ width: 400, height: 300 }, fit)).toBe(2)
  })
})

describe('zoomAt', () => {
  it('keeps the point under the cursor in place', () => {
    const at = { x: 100, y: -50 }
    const view = zoomAt(FIT, 2, at)
    // The image point under `at` before: (at - t) / s; after: t' + that * s'.
    expect(view.x + ((at.x - FIT.x) / FIT.scale) * view.scale).toBe(at.x)
    expect(view.y + ((at.y - FIT.y) / FIT.scale) * view.scale).toBe(at.y)
  })

  it('stays put when asked past the maximum', () => {
    const atMax = { scale: 4, x: 0, y: 0 }
    expect(zoomAt(atMax, 4.4, { x: 100, y: 50 }, 4)).toEqual(atMax)
  })

  it('zooms around the centre without moving it', () => {
    expect(zoomAt(FIT, 3, { x: 0, y: 0 })).toEqual({ scale: 3, x: 0, y: 0 })
  })
})

describe('clampView', () => {
  it('keeps the scale between fit and the maximum', () => {
    expect(clampView({ scale: 0.5, x: 0, y: 0 }, fit, stage, 4).scale).toBe(1)
    expect(clampView({ scale: 9, x: 0, y: 0 }, fit, stage, 4).scale).toBe(4)
  })

  it('centres an image smaller than the stage', () => {
    expect(clampView({ scale: 1.5, x: 120, y: -40 }, fit, stage, 4)).toEqual({
      scale: 1.5,
      x: 0,
      y: 0,
    })
  })

  it('lets a zoomed image move only as far as its edges', () => {
    // 4× → 1600×1200 on 800×600: 400 and 300 to spare on each side.
    expect(clampView({ scale: 4, x: 900, y: -900 }, fit, stage, 4)).toEqual({
      scale: 4,
      x: 400,
      y: -300,
    })
  })
})

describe('pinchView', () => {
  it('scales with the fingers and follows their midpoint', () => {
    const view = pinchView(
      FIT,
      { distance: 100, mid: { x: 0, y: 0 } },
      { distance: 250, mid: { x: 30, y: 10 } },
    )
    expect(view).toEqual({ scale: 2.5, x: 30, y: 10 })
  })
})

describe('wheelScale', () => {
  it('zooms in on scroll up and out on scroll down', () => {
    expect(wheelScale(1, -100, false, false)).toBeGreaterThan(1)
    expect(wheelScale(2, 100, false, false)).toBeLessThan(2)
  })

  it('is more sensitive for a trackpad pinch and line-based wheels', () => {
    expect(wheelScale(1, -10, true, false)).toBeCloseTo(wheelScale(1, -50, false, false))
    expect(wheelScale(1, -3, false, true)).toBeCloseTo(wheelScale(1, -48, false, false))
  })
})

describe('swipeGesture', () => {
  it('leafs on a long sideways drag', () => {
    expect(swipeGesture(-80, 10, 600)).toBe('next')
    expect(swipeGesture(80, -10, 600)).toBe('prev')
  })

  it('leafs on a quick flick', () => {
    expect(swipeGesture(-30, 0, 50)).toBe('next')
  })

  it('ignores a short slow drag', () => {
    expect(swipeGesture(-30, 0, 400)).toBe('none')
    expect(swipeGesture(5, 0, 10)).toBe('none')
  })

  it('closes on a long drag down only', () => {
    expect(swipeGesture(10, 140, 300)).toBe('close')
    expect(swipeGesture(0, 80, 300)).toBe('none')
    expect(swipeGesture(0, -200, 300)).toBe('none')
  })
})
