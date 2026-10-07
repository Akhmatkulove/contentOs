// The page after `page` of a `pageSize`-long list, or null once all `total` are loaded.
export function nextPage(total: number, page: number, pageSize: number): number | null {
  return page * pageSize < total ? page + 1 : null
}
