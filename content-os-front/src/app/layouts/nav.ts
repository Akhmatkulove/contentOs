import { computed } from 'vue'
import {
  useRouter,
  type RouteLocationNormalizedLoaded,
  type RouteLocationRaw,
  type RouteMeta,
  type Router,
} from 'vue-router'
import { useTasksBadge } from '@/entities/deliverable'
import { useSessionStore, type Me } from '@/entities/session'
import type { IconName } from '@/shared/ui/icon'
import { canOpen } from '../router/access'

export interface NavItem {
  label: string
  icon: IconName
  to: RouteLocationRaw
  // "3", "99+"; none when there's nothing to count.
  badge?: string
}

export const sidebarNav: NavItem[] = [
  { label: 'Home', icon: 'home-01', to: { name: 'home' } },
  { label: 'My tasks', icon: 'task-01', to: { name: 'tasks' } },
  { label: 'Shoots', icon: 'camera-01', to: { name: 'shoots' } },
  { label: 'Products', icon: 'package', to: { name: 'products' } },
  { label: 'Content', icon: 'image-02', to: { name: 'content' } },
  { label: 'References', icon: 'album-02', to: { name: 'references' } },
  { label: 'Activity', icon: 'clock-01', to: { name: 'activity' } },
]

// The mobile tab bar fits four sections; the rest live behind More.
const TABBAR_LIMIT = 4
const tabbarPicks = ['Home', 'My tasks', 'Shoots', 'Content']

export function badgeLabel(count: number): string | undefined {
  if (count <= 0) return undefined
  return count > 99 ? '99+' : String(count)
}

// A section is listed only if its route lets the user in, so the menu and the
// access guard can't disagree. `badges` are counts by section label.
export function navFor(router: Router, me: Me | null, badges: Record<string, number> = {}) {
  const sidebar = sidebarNav
    .filter((item) => canOpen(router.resolve(item.to), me))
    .map((item) => ({ ...item, badge: badgeLabel(badges[item.label] ?? 0) }))
  const tabbar =
    sidebar.length <= TABBAR_LIMIT
      ? sidebar
      : sidebar.filter((item) => tabbarPicks.includes(item.label))
  return { sidebar, tabbar }
}

// A section stays highlighted on its own screen and on screens nested in it
// (meta.section), e.g. Products on /products/new.
export function isNavItemActive(
  router: Router,
  item: NavItem,
  route: { name?: RouteLocationNormalizedLoaded['name'] | null; meta: RouteMeta },
) {
  const name = router.resolve(item.to).name
  return name !== undefined && (route.name === name || route.meta.section === name)
}

export function useNav() {
  const router = useRouter()
  const session = useSessionStore()
  // My tasks counts what waits for the user (docs/adr/0015).
  const tasks = useTasksBadge(() => session.me)
  return computed(() => navFor(router, session.me, { 'My tasks': tasks.value }))
}
