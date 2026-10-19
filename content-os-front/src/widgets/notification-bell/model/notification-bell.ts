import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { computed, onScopeDispose, ref } from 'vue'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications'
import { toNotification, type Notification } from './notification'
import { notificationKeys } from './notification-keys'
import { useSessionStore } from '@/entities/session'

// How often an open app looks for new notifications; it also looks when the tab
// gets focus again.
export const REFRESH_MS = 60_000

// The bell (docs/adr/0020): the user's latest notifications, the unread dot,
// opening one and Mark all as read. Only an approved user has notifications.
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
  const timer = setInterval(() => {
    if (userId.value) void refreshIfStale()
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
  }
}
