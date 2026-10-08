// Cache keys of tasks: the shoots' deliverables (docs/adr/0011). Saving a shoot
// or a product changes them, so those saves refresh `all`.
export const taskKeys = {
  all: ['tasks'] as const,
  list: (role: string, query: object) => ['tasks', 'list', role, query] as const,
  filters: ['tasks', 'filters'] as const,
}
