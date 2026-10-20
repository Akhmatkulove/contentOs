// Cache keys of the content page (docs/adr/0025). Send to brand adds content,
// so it refreshes `all`.
export const contentKeys = {
  all: ['content'] as const,
  lists: ['content', 'list'] as const,
  list: (query: object) => [...contentKeys.lists, query] as const,
  // Products, shoots and creators of the visible content.
  filters: ['content', 'filters'] as const,
  // The content page of a sent deliverable (docs/adr/0026).
  detail: (id: string) => ['content', 'detail', id] as const,
}
