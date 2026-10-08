// Cache keys of shoots. Everything built from the shoot list sits under `lists`,
// so one invalidation after a save refreshes all of it. A save writes the shoot
// it got back into `detail`: the open shoot isn't fetched again.
export const shootKeys = {
  all: ['shoots'] as const,
  lists: ['shoots', 'list'] as const,
  list: (query: object) => [...shootKeys.lists, query] as const,
  // Figma "Card / Next shoot".
  next: ['shoots', 'list', 'next'] as const,
  // Figma "Card / Shoot overview": counts for the period.
  overview: (period: string) => [...shootKeys.lists, 'overview', period] as const,
  // The shoot page and the edit form share the entry.
  detail: (id: string) => ['shoots', 'detail', id] as const,
  notes: (id: string) => [...shootKeys.detail(id), 'notes'] as const,
}
