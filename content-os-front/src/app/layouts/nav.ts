import type { RouteLocationRaw } from 'vue-router'
import type { Role } from '@/entities/session'
import type { IconName } from '@/shared/ui/icon'

export interface NavItem {
  label: string
  icon: IconName
  // Sections without a page yet have no route and render as inert items.
  to?: RouteLocationRaw
  badge?: number
}

export const sidebarNav: NavItem[] = [
  { label: 'Home', icon: 'home-01', to: { name: 'home' } },
  { label: 'My tasks', icon: 'task-01' },
  { label: 'Shoots', icon: 'camera-01' },
  { label: 'Products', icon: 'package' },
  { label: 'Content', icon: 'image-02' },
  { label: 'References', icon: 'album-02' },
  { label: 'Activity', icon: 'clock-01' },
]

// The mobile tab bar fits four sections; the rest live behind More.
export const tabbarNav: NavItem[] = sidebarNav.filter((item) =>
  ['Home', 'My tasks', 'Shoots', 'Content'].includes(item.label),
)

export const roleLabels: Record<Role, string> = {
  brand: 'Brand',
  art_director: 'Art Director',
  creator: 'Creator',
}
