import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { useDocumentVisibility } from '@vueuse/core'
import { computed, onScopeDispose, ref, watch } from 'vue'
import {
  clearNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications'
import { toNotification, type Notification } from './notification'
import { notificationKeys } from './notification-keys'
import { useSessionStore } from '@/entities/session'

// How often an open app looks for new notifications; it also looks when the tab
// gets focus again.
const REFRESH_MS = 60_000

// The bell (docs/adr/0020): the user's latest notifications, the unread dot,
// opening one, Mark all as read and Clear all. Only an approved user has notifications.
export function useNotificationBell() {
  const session = useSessionStore()
  const userId = computed(() => (session.me?.status === 'approved' ? session.me.id : ''))

  const { data, refresh: refreshIfStale } = useQuery({
    key: () => notificationKeys.list(userId.value),
    query: fetchNotifications,
    enabled: () => userId.value !== '',
    // Several bells share the entry (the page's and the topbar's): within a
    // minute a refresh is a no-op, so they ask once between them.
    staleTime: REFRESH_MS - 5_000,
    // The bell stays quiet: no toast for a failed background refresh.
    meta: { toast: false },
  })
  // A hidden tab doesn't ask: the query refreshes itself when the tab gets focus again.
  const visibility = useDocumentVisibility()
  const timer = setInterval(() => {
    if (userId.value && visibility.value === 'visible') void refreshIfStale()
  }, REFRESH_MS)
  onScopeDispose(() => clearInterval(timer))

  const notifications = computed(() => {
    const now = new Date()
    return (data.value?.items ?? []).map((item) => toNotification(item, now))
  })
  const unread = computed(() => data.value?.unread ?? 0)
  const open = ref(false)

  const queryCache = useQueryCache()
  const refresh = () => queryCache.invalidateQueries({ key: notificationKeys.all })

  const { mutate: readOne } = useMutation({
    mutation: markNotificationRead,
    onSettled: refresh,
  })
  const { mutate: readAll, isLoading: readingAll } = useMutation({
    mutation: markAllNotificationsRead,
    onSettled: refresh,
  })

  // Clear all asks first, in the panel's header: a modal over the popover would
  // close it. The list empties at once and comes back if deleting fails (the
  // global handler shows the error toast).
  const confirmingClear = ref(false)
  watch(open, () => (confirmingClear.value = false))
  const { mutate: clearAll, isLoading: clearing } = useMutation({
    mutation: clearNotifications,
    onMutate: () => {
      const key = notificationKeys.list(userId.value)
      const previous = queryCache.getQueryData<typeof data.value>(key)
      queryCache.setQueryData(key, { items: [], unread: 0 })
      return { key, previous }
    },
    onError: (_error, _vars, { key, previous }) => {
      if (previous) queryCache.setQueryData(key, previous)
    },
    onSettled: refresh,
  })
  function confirmClear() {
    confirmingClear.value = false
    clearAll()
  }

  // Opening one (its link goes where it points) reads it and closes the panel.
  function openNotification(notification: Notification) {
    if (!notification.read) readOne(notification.id)
    open.value = false
  }

  return {
    enabled: computed(() => userId.value !== ''),
    notifications,
    unread,
    open,
    openNotification,
    readAll: () => readAll(),
    readingAll,
    confirmingClear,
    confirmClear,
    clearing,
  }
}
