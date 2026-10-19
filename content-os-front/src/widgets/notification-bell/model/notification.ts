import type { RouteLocationRaw } from 'vue-router'
import type { NotificationItem } from '../api/notifications'

// A notification as the bell shows it.
export interface Notification {
  id: string
  // "Acme assigned you 3 deliverables in Black Abaya",
  // "Your order is ready: Close-up for Black Abaya (3 files)".
  text: string
  // "5 min ago", "Yesterday", "Sep 18".
  time: string
  read: boolean
  photoUrl: string | null
  to: RouteLocationRaw
}

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

// How long ago, in the bell's words.
export function timeAgo(iso: string, now: Date): string {
  const at = new Date(iso)
  const passed = now.getTime() - at.getTime()
  if (passed < MINUTE) return 'Just now'
  if (passed < HOUR) return `${Math.floor(passed / MINUTE)} min ago`
  if (passed < DAY) return `${Math.floor(passed / HOUR)} h ago`
  if (passed < 2 * DAY) return 'Yesterday'
  return at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function toNotification(item: NotificationItem, now: Date): Notification {
  if (item.type === 'content_sent') return contentSent(item, now)
  const who = item.actor?.name || 'A brand'
  const what = `${item.count} ${item.count === 1 ? 'deliverable' : 'deliverables'}`
  const product = item.product
  return {
    id: item.id,
    text: product
      ? `${who} assigned you ${what} in ${product.name}`
      : `${who} assigned you ${what}`,
    time: timeAgo(item.created_at, now),
    read: item.read,
    photoUrl: product?.photo?.url ?? null,
    // The backlog of that product: what was assigned, with Plan shoot (docs/adr/0019).
    to: { name: 'tasks', query: { view: 'brand', ...(product && { product: product.id }) } },
  }
}

// To the brand: the art director sent a deliverable's approved files (docs/adr/0025).
// Opens the content page narrowed to that product.
function contentSent(item: NotificationItem, now: Date): Notification {
  const product = item.product
  const deliverable = item.deliverable?.name
  // "Close-up for Black Abaya", or whichever of the two is left.
  const order = deliverable
    ? product
      ? `${deliverable} for ${product.name}`
      : deliverable
    : (product?.name ?? '')
  const files = `${item.count} ${item.count === 1 ? 'file' : 'files'}`
  return {
    id: item.id,
    text: order ? `Your order is ready: ${order} (${files})` : `Your order is ready (${files})`,
    time: timeAgo(item.created_at, now),
    read: item.read,
    photoUrl: product?.photo?.url ?? null,
    to: { name: 'content', query: product ? { product: product.id } : {} },
  }
}
