import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchMe, logout as logoutRequest } from '../api/session'
import type { Me } from './me'

export const useSessionStore = defineStore('session', () => {
  const me = ref<Me | null>(null)
  // Whether /me has been asked at least once; until then `me === null` means "unknown".
  const loaded = ref(false)

  async function load() {
    me.value = await fetchMe()
    loaded.value = true
    return me.value
  }

  function set(value: Me) {
    me.value = value
    loaded.value = true
  }

  function clear() {
    me.value = null
    loaded.value = true
  }

  async function logout() {
    await logoutRequest()
    clear()
  }

  return { me, loaded, load, set, clear, logout }
})
