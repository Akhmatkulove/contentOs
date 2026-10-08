// Cache keys of products. Everything built from the products the user sees sits
// under `lists`, so one invalidation after a save refreshes all of it. A save
// writes the product it got back into `detail`: the open product isn't fetched again.
export const productKeys = {
  all: ['products'] as const,
  lists: ['products', 'list'] as const,
  list: (query: object) => [...productKeys.lists, query] as const,
  // "Browse all products" of the shoot form.
  picker: (search: string) => [...productKeys.lists, 'picker', search] as const,
  // Collections: the Collection filter.
  filters: ['products', 'list', 'filters'] as const,
  // Every product by name: the Product field of "Add reference".
  options: ['products', 'list', 'options'] as const,
  // The product page and the edit form share the entry.
  detail: (id: string) => ['products', 'detail', id] as const,
}
