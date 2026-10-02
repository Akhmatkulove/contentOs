import { useQueryCache } from '@pinia/colada'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchMe, logout as logoutRequest } from '../api/session'
import type { Me } from './me'

// What decides which data a user may see. When it changes, cached responses
// belong to someone else (another account, a role or status that no longer applies).
function accessKey(me: Me | null): string | null {
  return me && `${me.id}:${me.role}:${me.status}`
}

export const useSessionStore = defineStore('session', () => {
  const me = ref<Me | null>(null)
  // Whether /me has been asked at least once; until then `me === null` means "unknown".
  const loaded = ref(false)

  function apply(next: Me | null) {
    if (loaded.value && accessKey(next) !== accessKey(me.value)) dropCachedData()
    me.value = next
    loaded.value = true
  }

  async function load() {
    apply(await fetchMe())
    return me.value
  }

  function set(value: Me) {
    apply(value)
  }

  function clear() {
    apply(null)
  }

  async function logout() {
    await logoutRequest()
    clear()
  }

  return { me, loaded, load, set, clear, logout }
})

function dropCachedData() {
  const cache = useQueryCache()
  cache.cancelQueries()
  for (const entry of cache.getEntries()) cache.remove(entry)
}
