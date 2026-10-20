import { http, type Schemas } from '@/shared/api'

export type NotificationList = Schemas['NotificationList']
export type NotificationItem = Schemas['NotificationResponse']

// The latest notifications, newest first, and how many are unread (docs/adr/0020).
export async function fetchNotifications(): Promise<NotificationList> {
  return (await http.get<NotificationList>('/notifications')).data
}

export async function markNotificationRead(id: string): Promise<void> {
  await http.post(`/notifications/${id}/read`)
}

export async function markAllNotificationsRead(): Promise<void> {
  await http.post('/notifications/read')
}

// Clear all: deletes every notification of the user, read or not.
export async function clearNotifications(): Promise<void> {
  await http.delete('/notifications')
}
