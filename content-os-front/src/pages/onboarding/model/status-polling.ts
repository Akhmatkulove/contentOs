import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/entities/session'

const POLL_INTERVAL_MS = 30_000

// No push channel: ask for the status every 30s and whenever the tab comes back,
// until the application is approved.
export function useStatusPolling() {
  const router = useRouter()
  const session = useSessionStore()
  const status = computed(() => session.me?.status)

  async function refresh() {
    try {
      if ((await session.load()) === null) await router.push({ name: 'login' })
    } catch {
      // Offline or the server hiccuped: the next tick will try again.
    }
  }

  const visibility = useDocumentVisibility()
  // A hidden tab doesn't ask; it catches up as soon as it is visible again.
  const { pause } = useIntervalFn(() => {
    if (visibility.value === 'visible') void refresh()
  }, POLL_INTERVAL_MS)
  watch(visibility, (value) => {
    if (value === 'visible' && status.value !== 'approved') void refresh()
  })
  watch(status, (value) => {
    if (value === 'approved') pause()
  })

  return { status }
}
