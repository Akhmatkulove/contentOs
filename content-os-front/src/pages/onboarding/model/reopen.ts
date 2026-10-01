import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { homeRoute, useSessionStore } from '@/entities/session'
import { reopenApplication } from '../api/onboarding'

// "Edit my details" from the sent and status screens: the application goes back to
// onboarding with its answers, and the user lands on the review step to change them.
export function useReopen() {
  const router = useRouter()
  const session = useSessionStore()
  const reopening = ref(false)
  const failed = ref(false)

  async function reopen() {
    reopening.value = true
    failed.value = false
    try {
      const me = await reopenApplication()
      session.set(me)
      await router.push(homeRoute(me))
    } catch {
      failed.value = true
    } finally {
      reopening.value = false
    }
  }

  return { reopen, reopening, failed }
}
