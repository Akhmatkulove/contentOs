import type { RouteLocationRaw } from 'vue-router'
import type { Me } from './me'

// The one place a user belongs right now, by account status.
export function homeRoute(me: Me | null): RouteLocationRaw {
  if (me === null) return { name: 'login' }
  switch (me.status) {
    case 'onboarding':
      return { name: `onboarding-${me.onboarding_step ?? 'role'}` }
    case 'pending_review':
    case 'rejected':
      return { name: 'onboarding-status' }
    case 'approved':
      return { name: 'home' }
  }
}
