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
  if (item.type === 'content_commented') return contentCommented(item, now)
  if (item.type === 'content_approved') return contentApproved(item, now)
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

// "Close-up for Black Abaya", or whichever of the two is left.
function contentName(item: NotificationItem): string {
  const deliverable = item.deliverable?.name
  const product = item.product?.name
  if (deliverable && product) return `${deliverable} for ${product}`
  return deliverable ?? product ?? ''
}

// The content page of the deliverable (docs/adr/0026); without it, Content
// narrowed to the product.
function contentRoute(item: NotificationItem): RouteLocationRaw {
  if (item.deliverable) return { name: 'content-item', params: { id: item.deliverable.id } }
  return { name: 'content', query: item.product ? { product: item.product.id } : {} }
}

function contentNotification(item: NotificationItem, text: string, now: Date): Notification {
  return {
    id: item.id,
    text,
    time: timeAgo(item.created_at, now),
    read: item.read,
    photoUrl: item.product?.photo?.url ?? null,
    to: contentRoute(item),
  }
}

// To the brand: the art director sent a deliverable's approved files (docs/adr/0025).
function contentSent(item: NotificationItem, now: Date): Notification {
  const order = contentName(item)
  const files = `${item.count} ${item.count === 1 ? 'file' : 'files'}`
  return contentNotification(
    item,
    order ? `Your order is ready: ${order} (${files})` : `Your order is ready (${files})`,
    now,
  )
}

// To everyone involved but the author: comments on the content page, the unread
// ones counted together (docs/adr/0026).
function contentCommented(item: NotificationItem, now: Date): Notification {
  const what = contentName(item) || 'your content'
  const text =
    item.count > 1
      ? `${item.count} new comments on ${what}`
      : `${item.actor?.name || 'Someone'} commented on ${what}`
  return contentNotification(item, text, now)
}

// To the art director and the creators: the brand approved the content (docs/adr/0026).
function contentApproved(item: NotificationItem, now: Date): Notification {
  const what = contentName(item) || 'your content'
  return contentNotification(item, `${item.actor?.name || 'The brand'} approved ${what}`, now)
}
