import { computed } from 'vue'
import {
  useRouter,
  type RouteLocationNormalizedLoaded,
  type RouteLocationRaw,
  type RouteMeta,
  type Router,
} from 'vue-router'
import { useSessionStore, type Me, type Role } from '@/entities/session'
import type { IconName } from '@/shared/ui/icon'
import { canOpen } from '../router/access'

export interface NavItem {
  label: string
  icon: IconName
  to: RouteLocationRaw
  badge?: number
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

// A section is listed only if its route lets the user in, so the menu and the
// access guard can't disagree.
export function navFor(router: Router, me: Me | null) {
  const sidebar = sidebarNav.filter((item) => canOpen(router.resolve(item.to), me))
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
  return computed(() => navFor(router, session.me))
}

export const roleLabels: Record<Role, string> = {
  brand: 'Brand',
  art_director: 'Art Director',
  creator: 'Creator',
}
