const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

// How long ago, as the bell and the activity feed say it.
export function timeAgo(iso: string, now: Date): string {
  const at = new Date(iso)
  const passed = now.getTime() - at.getTime()
  if (passed < MINUTE) return 'Just now'
  if (passed < HOUR) return `${Math.floor(passed / MINUTE)} min ago`
  if (passed < DAY) return `${Math.floor(passed / HOUR)} h ago`
  if (passed < 2 * DAY) return 'Yesterday'
  return at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
