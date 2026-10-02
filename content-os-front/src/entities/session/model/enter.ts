import { useRouter } from 'vue-router'
import { homeRoute } from './home'
import type { Me } from './me'
import { useSessionStore } from './store'

// After login, signup or anything else that returns a fresh /me: remember the user
// and send them where they belong right now.
export function useEnterSession() {
  const router = useRouter()
  const session = useSessionStore()

  return async function enter(me: Me) {
    session.set(me)
    await router.push(homeRoute(me))
  }
}
