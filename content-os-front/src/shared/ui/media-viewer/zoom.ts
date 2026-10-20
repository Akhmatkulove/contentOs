// Zoom and pan of the image in the viewer. The image is laid out to fit the
// stage, centred; the view moves it by (x, y) from the centre and scales it
// around its own centre. Points are measured from the stage centre.

export interface Size {
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

export interface View extends Point {
  scale: number
}

export const FIT: View = { scale: 1, x: 0, y: 0 }

// However small the original, the image can be blown up this far.
const MIN_MAX_SCALE = 4

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// Up to the original's pixels 1:1, and at least 4×.
export function maxScale(natural: Size, fit: Size): number {
  if (!fit.width) return MIN_MAX_SCALE
  return Math.max(MIN_MAX_SCALE, natural.width / fit.width)
}

// A double tap or a click: close to the original's pixels, between 2× and 4×.
export function tapScale(natural: Size, fit: Size): number {
  if (!fit.width) return 2
  return clamp(natural.width / fit.width, 2, MIN_MAX_SCALE)
}

// Keeps the scale in range and the zoomed image over the stage: it can't be
// dragged off so far that empty stage shows on a side it covers.
export function clampView(view: View, fit: Size, stage: Size, max: number): View {
  const scale = clamp(view.scale, 1, max)
  const overflowX = Math.max(0, (fit.width * scale - stage.width) / 2)
  const overflowY = Math.max(0, (fit.height * scale - stage.height) / 2)
  return {
    scale,
    // + 0 turns -0 into 0.
    x: clamp(view.x, -overflowX, overflowX) + 0,
    y: clamp(view.y, -overflowY, overflowY) + 0,
  }
}

// Scales to `scale` (kept between fit and `max`) keeping the image point under
// `at` where it is. The scale is limited first: limited after, a zoom past the
// maximum would still move the image as if it had zoomed.
export function zoomAt(view: View, scale: number, at: Point, max = Infinity): View {
  scale = clamp(scale, 1, max)
  const ratio = scale / view.scale
  return {
    scale,
    x: at.x - (at.x - view.x) * ratio,
    y: at.y - (at.y - view.y) * ratio,
  }
}

// Two fingers: the scale follows the distance between them, the image follows
// their midpoint. `start` is the view when the second finger touched down.
export function pinchView(
  start: View,
  from: { distance: number; mid: Point },
  to: { distance: number; mid: Point },
  max = Infinity,
): View {
  const zoomed = zoomAt(start, (start.scale * to.distance) / from.distance, from.mid, max)
  return { ...zoomed, x: zoomed.x + to.mid.x - from.mid.x, y: zoomed.y + to.mid.y - from.mid.y }
}

// Wheel and trackpad: a pinch on a trackpad arrives as a wheel with ctrlKey and
// small deltas, so it is more sensitive. Line-based deltas (some mice) are ~16px.
export function wheelScale(scale: number, deltaY: number, pinch: boolean, lines: boolean): number {
  const pixels = lines ? deltaY * 16 : deltaY
  return scale * Math.exp(-pixels * (pinch ? 0.01 : 0.002))
}

// A finger moving less than this is still a tap.
export const TAP_SLOP = 8
// Two taps closer than this in time are a double tap.
export const DOUBLE_TAP_MS = 300
const SWIPE_DISTANCE = 60
const FLICK_SPEED = 0.4 // px per ms
const CLOSE_DISTANCE = 120

type Swipe = 'next' | 'prev' | 'close' | 'none'

// A finished one-finger drag over the unzoomed image: sideways leafs through
// the files (a long drag or a quick flick), down closes the viewer.
export function swipeGesture(dx: number, dy: number, ms: number): Swipe {
  const speed = Math.abs(dx) / Math.max(ms, 1)
  if (Math.abs(dx) > Math.abs(dy)) {
    if (Math.abs(dx) >= SWIPE_DISTANCE || (Math.abs(dx) >= TAP_SLOP * 2 && speed >= FLICK_SPEED))
      return dx < 0 ? 'next' : 'prev'
    return 'none'
  }
  return dy >= CLOSE_DISTANCE ? 'close' : 'none'
}
