import type { RouteLocationRaw } from 'vue-router'
import type { Role } from '@/entities/session'
import type { IconName } from '@/shared/ui/icon'

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
export const tabbarNav: NavItem[] = sidebarNav.filter((item) =>
  ['Home', 'My tasks', 'Shoots', 'Content'].includes(item.label),
)

export const roleLabels: Record<Role, string> = {
  brand: 'Brand',
  art_director: 'Art Director',
  creator: 'Creator',
}
