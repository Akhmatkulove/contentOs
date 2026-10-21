// Cache keys of the activity feed (docs/adr/0027). Its only consumer is the home
// page; they move to an entity once the Activity page reads the feed too.
export const activityKeys = {
  all: ['activity'] as const,
  latest: (limit: number) => ['activity', 'list', 'latest', limit] as const,
}
