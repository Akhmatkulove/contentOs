// Cache keys of tasks: the shoots' deliverables (docs/adr/0011). Saving a shoot
// or a product changes them, so those saves refresh `all`.
export const taskKeys = {
  all: ['tasks'] as const,
  list: (role: string, query: object) => ['tasks', 'list', role, query] as const,
  filters: ['tasks', 'filters'] as const,
  // The tabs' sizes for the menu badge; per user and role, so another login or
  // a changed role doesn't see them.
  counts: (userId: string, role: string) => ['tasks', 'list', 'counts', userId, role] as const,
  // The task page: the row plus its content versions (docs/adr/0012).
  detail: (id: string) => ['tasks', 'detail', id] as const,
  // The art director's review of the deliverable: every assignee's work (docs/adr/0015).
  review: (id: string) => ['tasks', 'review', id] as const,
}
