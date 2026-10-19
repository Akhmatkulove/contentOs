// Cache keys of the reference pool. Adding or deleting a reference refreshes
// `all`; a star refreshes only `lists`, since the filter options stay the same.
export const referenceKeys = {
  all: ['references'] as const,
  lists: ['references', 'list'] as const,
  list: (query: object) => [...referenceKeys.lists, query] as const,
  // The Collections tab of the references page.
  collections: (query: object) => [...referenceKeys.lists, 'collections', query] as const,
  // "Browse reference bank" of the shoot form.
  picker: (query: object) => [...referenceKeys.lists, 'picker', query] as const,
  // Products, creators and tags of the pool: the references page and the
  // reference bank share the entry.
  filters: ['references', 'filters'] as const,
  // The reference page. A star there refreshes `lists` as well; a star on a
  // list refreshes the page's entry.
  detail: (id: string) => ['references', 'detail', id] as const,
}
