// Cache keys of the bell's notifications (docs/adr/0020). Per user: another
// login on the same tab doesn't see the previous one's.
export const notificationKeys = {
  all: ['notifications'] as const,
  list: (userId: string) => ['notifications', 'list', userId] as const,
}
