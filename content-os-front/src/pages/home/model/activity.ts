import type { RouteLocationRaw } from 'vue-router'
import { timeAgo } from '@/shared/lib'
import type { ActivityItem } from '../api/home'

// A row of Latest activity (Figma "activity"): who did what, the line under it,
// how long ago.
export interface ActivityRow {
  id: string
  // "Amina approved 5 files", "You requested changes from Lana".
  title: string
  // The deliverable and shoot, the quoted comment or the shoot.
  detail: string
  time: string
  // The actor's avatar, or the check tile of a completed shoot.
  actor: { name: string | null; photoUrl: string | null } | null
  to: RouteLocationRaw
}

function files(count: number): string {
  return `${count} ${count === 1 ? 'file' : 'files'}`
}

export function toActivityRow(
  item: ActivityItem,
  meId: string | undefined,
  now: Date,
): ActivityRow {
  const isMe = (person: ActivityItem['actor']) => person !== null && person.id === meId
  const who = isMe(item.actor) ? 'You' : item.actor?.name || 'Someone'
  const whose = isMe(item.subject) ? 'your' : `${item.subject?.name || 'someone'}'s`
  const whom = isMe(item.subject) ? 'you' : item.subject?.name || 'someone'
  // The brand gets no shoot (docs/adr/0027): then the product stands in for it.
  const shoot = item.shoot?.name ?? item.product?.name ?? ''
  const deliverable = [item.deliverable?.name, shoot].filter(Boolean).join(' · ')

  const shootRoute: RouteLocationRaw = item.shoot
    ? { name: 'shoot', params: { id: item.shoot.id } }
    : { name: 'content' }
  // An upload waits for the art director's review; the other task events open the task.
  const taskRoute = (review: boolean): RouteLocationRaw =>
    item.deliverable
      ? { name: review ? 'task-review' : 'task', params: { id: item.deliverable.id } }
      : shootRoute
  const contentRoute: RouteLocationRaw = item.deliverable
    ? { name: 'content-item', params: { id: item.deliverable.id } }
    : shootRoute

  const row = (title: string, detail: string, to: RouteLocationRaw): ActivityRow => ({
    id: item.id,
    title,
    detail,
    time: timeAgo(item.created_at, now),
    actor: { name: item.actor?.name ?? null, photoUrl: item.actor?.photo_url ?? null },
    to,
  })

  switch (item.type) {
    case 'shoot_created':
      return row(`${who} created a shoot`, shoot, shootRoute)
    case 'version_submitted':
      return row(`${who} uploaded ${files(item.count)}`, deliverable, taskRoute(true))
    case 'version_approved':
      return row(`${who} approved ${whose} work`, deliverable, taskRoute(false))
    case 'changes_requested':
      return row(`${who} requested changes from ${whom}`, deliverable, taskRoute(false))
    case 'content_sent':
      return row(`${who} sent ${files(item.count)} to the brand`, deliverable, contentRoute)
    case 'content_commented':
      return row(
        `${who} left a comment`,
        item.comment ? `“${item.comment}”` : deliverable,
        contentRoute,
      )
    case 'content_approved':
      return row(`${who} approved ${files(item.count)}`, deliverable, contentRoute)
    case 'shoot_completed':
      return {
        ...row(`${shoot} marked as completed`, 'All deliverables sent', shootRoute),
        actor: null,
      }
  }
}
