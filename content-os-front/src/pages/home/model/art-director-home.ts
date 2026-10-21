import { useQuery } from '@pinia/colada'
import { computed } from 'vue'
import { formatDueDate, taskKeys } from '@/entities/deliverable'
import { fetchProducts, productKeys, type ProductListItem } from '@/entities/product'
import { roleLabels, useSessionStore } from '@/entities/session'
import { progressPercent, shootKeys, shootStatuses } from '@/entities/shoot'
import { fetchCreators, teamKeys, type TeamMember } from '@/entities/team'
import type { Schemas } from '@/shared/api'
import { fetchActivity, fetchRecentShoots, fetchSentCount, fetchTopTasks } from '../api/home'
import { toActivityRow } from './activity'
import { activityKeys } from './activity-keys'
import { greeting, monthStart, todayLabel } from './greeting'

// Figma shows four tiles in a row; the task and activity lists show about five
// and scroll for the rest.
export const TILES = 4
export const TASKS = 10
export const EVENTS = 10

export interface ShootTile {
  id: string
  name: string
  // "Sep 18, 2024 · Tashkent Studio"; the location is left out when not set.
  meta: string
  status: (typeof shootStatuses)[Schemas['ShootStatus']]
  photoUrl: string | null
  approved: number
  deliverables: number
  // Approved out of all deliverables, 0–100.
  percent: number
}

export function toShootTile(item: Schemas['ShootListItem']): ShootTile {
  return {
    id: item.id,
    name: item.name,
    meta: [formatDueDate(item.date), item.location].filter(Boolean).join(' · '),
    status: shootStatuses[item.status],
    photoUrl: item.photo?.url ?? null,
    approved: item.approved,
    deliverables: item.deliverables,
    percent: progressPercent(item.approved, item.deliverables),
  }
}

export interface ProductTile {
  id: string
  name: string
  collection: string
  photoUrl: string | null
  // For the "…" menu.
  status: ProductListItem['status']
  inWork: boolean
  // The user's orders of the product and how many are sent (docs/adr/0027).
  approved: number
  deliverables: number
  percent: number
}

export function toProductTile(item: ProductListItem): ProductTile {
  return {
    id: item.id,
    name: item.name,
    collection: item.collection ?? '',
    photoUrl: item.photo?.url ?? null,
    status: item.status,
    inWork: item.in_work,
    approved: item.approved,
    deliverables: item.deliverables,
    percent: progressPercent(item.approved, item.deliverables),
  }
}

export interface TaskRow {
  id: string
  name: string
  product: string
  // Figma ticks the box of a finished task.
  done: boolean
  // Like My tasks: an upload to check or changes asked for open the review.
  review: boolean
}

export function toTaskRow(item: Schemas['TaskItem']): TaskRow {
  return {
    id: item.id,
    name: item.name,
    product: item.product.name,
    done: item.status === 'approved',
    review: item.status === 'needs_review' || item.status === 'needs_changes',
  }
}

export interface TeamChip {
  id: string
  name: string
  photoUrl: string | null
  role: string
}

// The art director first, then their creators (docs/adr/0002). The backend has
// one creator role, "Creator / Mobilograph": Figma's Mobilographer and Video
// Editor aren't told apart.
export function teamChips(me: TeamMember | null, creators: TeamMember[]): TeamChip[] {
  const chip = (member: TeamMember, role: string): TeamChip => ({
    id: member.id,
    name: member.name || 'Unnamed',
    photoUrl: member.photo_url,
    role,
  })
  return [
    ...(me ? [chip(me, roleLabels.art_director)] : []),
    ...creators.map((member) => chip(member, roleLabels.creator)),
  ]
}

// Figma "SCREEN:h_ad Art Director view": the art director's home.
export function useArtDirectorHome() {
  const session = useSessionStore()
  const now = new Date()

  const title = computed(() => {
    const name = session.me?.name
    return name ? `${greeting(now)}, ${name}` : greeting(now)
  })
  const today = todayLabel(now)

  const shootsQuery = useQuery({
    key: shootKeys.list({ home: true, sort: 'newest', perPage: TILES }),
    query: () => fetchRecentShoots(TILES),
  })
  // Active products: the newest are the tiles, the total is the KPI.
  const productsQuery = useQuery({
    key: productKeys.list({ home: true, status: 'active', sort: 'newest', perPage: TILES }),
    query: () =>
      fetchProducts({ search: '', status: 'active', sort: 'newest', page: 1, perPage: TILES }),
  })
  const tasksQuery = useQuery({
    key: taskKeys.list('art_director', { home: true, sort: 'priority', perPage: TASKS }),
    query: () => fetchTopTasks(TASKS),
  })
  const creatorsQuery = useQuery({ key: teamKeys.creators, query: fetchCreators })
  // Deliverables this month: sent to the brand since the 1st, in the user's time zone.
  const since = monthStart(now)
  const sentQuery = useQuery({
    key: taskKeys.list('art_director', { home: true, sentSince: since.toISOString() }),
    query: () => fetchSentCount(since),
    // Sends and reviews happen on other pages: count again on every visit.
    staleTime: 0,
  })
  const activityQuery = useQuery({
    key: activityKeys.latest(EVENTS),
    query: () => fetchActivity(EVENTS),
    // Whatever the user just did elsewhere shows up on the next visit.
    staleTime: 0,
  })

  const shoots = computed(() => (shootsQuery.data.value?.items ?? []).map(toShootTile))
  const products = computed(() => (productsQuery.data.value?.items ?? []).map(toProductTile))
  const tasks = computed(() => (tasksQuery.data.value?.items ?? []).map(toTaskRow))
  const activity = computed(() =>
    (activityQuery.data.value?.items ?? []).map((item) => toActivityRow(item, session.me?.id, now)),
  )
  const team = computed(() => {
    const me = session.me
    return teamChips(
      me ? { id: me.id, name: me.name, photo_url: me.photo_url } : null,
      creatorsQuery.data.value ?? [],
    )
  })

  // Undefined until loaded: the card shows a dash instead of a made-up 0.
  const kpi = computed(() => ({
    activeProducts: productsQuery.data.value?.total,
    shootsInProgress: shootsQuery.data.value?.counts.in_progress,
    deliverablesThisMonth: sentQuery.data.value,
  }))

  // Nothing to show yet: the very first load, so empty states don't flash.
  const loaded = (query: { data: { value: unknown } }) => query.data.value !== undefined

  return {
    title,
    today,
    kpi,
    shoots,
    shootsLoaded: computed(() => loaded(shootsQuery)),
    products,
    productsLoaded: computed(() => loaded(productsQuery)),
    tasks,
    tasksLoaded: computed(() => loaded(tasksQuery)),
    activity,
    activityLoaded: computed(() => loaded(activityQuery)),
    team,
  }
}
