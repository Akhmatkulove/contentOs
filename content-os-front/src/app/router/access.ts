import type { RouteLocationNormalized, RouteLocationRaw, Router } from 'vue-router'
import { homeRoute, useSessionStore, type Me, type OnboardingStep } from '@/entities/session'
import { errorStatus, http } from '@/shared/api'

// Who may open a route. Routes without `access` (404, 500) are open to everyone.
//   guest       — no session: login, signup
//   onboarding  — status onboarding, and only steps already reached
//   review      — application sent: under review or rejected
//   approved    — the product itself
export type Access = 'guest' | 'onboarding' | 'review' | 'approved'

declare module 'vue-router' {
  interface RouteMeta {
    access?: Access
    // Onboarding step the route shows, for access: 'onboarding'.
    step?: OnboardingStep
  }
}

const STEP_ORDER: OnboardingStep[] = ['role', 'profile', 'review']

// Only the route's meta matters, so resolved and normalized locations both fit.
type Target = Pick<RouteLocationNormalized, 'meta'>

function canOpen(to: Target, me: Me | null): boolean {
  switch (to.meta.access) {
    case undefined:
      return true
    case 'guest':
      return me === null
    case 'onboarding': {
      if (me?.status !== 'onboarding' || !to.meta.step) return false
      // Going back to a filled step is fine, skipping ahead is not.
      return STEP_ORDER.indexOf(to.meta.step) <= STEP_ORDER.indexOf(me.onboarding_step ?? 'role')
    }
    case 'review':
      return me?.status === 'pending_review' || me?.status === 'rejected'
    case 'approved':
      return me?.status === 'approved'
  }
}

export function accessRedirect(to: Target, me: Me | null): RouteLocationRaw | true {
  return canOpen(to, me) ? true : homeRoute(me)
}

export function installAccessGuard(router: Router) {
  router.beforeEach(async (to) => {
    if (to.name === 'server-error') return true
    const session = useSessionStore()
    if (!session.loaded) {
      try {
        await session.load()
      } catch {
        // Without /me no route can be judged: the backend is down or failing.
        return { name: 'server-error', query: { from: to.fullPath } }
      }
    }
    return accessRedirect(to, session.me)
  })
}

// Reacts to the backend changing its mind mid-session: the session expired (401),
// or the status changed and a request is no longer allowed (403).
export function installSessionInterceptor(router: Router) {
  http.interceptors.response.use(undefined, async (error: unknown) => {
    const session = useSessionStore()
    const status = errorStatus(error)
    // Without a session, 401/403 are ordinary answers (wrong password and the like).
    if (session.me !== null && status === 401) {
      session.clear()
      await router.push({ name: 'login' })
    } else if (session.me !== null && status === 403) {
      await router.push(homeRoute(await session.load()))
    }
    return Promise.reject(error)
  })
}
