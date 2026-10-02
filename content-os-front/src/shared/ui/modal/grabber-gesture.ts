// What a finished touch on the sheet grabber means. The sheet doesn't follow
// the finger: only where the pointer was released matters.

// A finger moving less than this is still a tap.
export const TAP_SLOP = 8

// Pulling down at least this far closes the sheet.
export const SWIPE_CLOSE_DISTANCE = 24

export type GrabberGesture = 'tap' | 'swipe-down' | 'none'

// dy: pointerup Y minus pointerdown Y, positive downwards.
export function grabberGesture(dy: number): GrabberGesture {
  if (Math.abs(dy) < TAP_SLOP) return 'tap'
  if (dy >= SWIPE_CLOSE_DISTANCE) return 'swipe-down'
  return 'none'
}
