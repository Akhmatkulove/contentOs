// A count badge: nothing for 0, "99+" past 99.
export function badgeLabel(count: number): string | undefined {
  if (count <= 0) return undefined
  return count > 99 ? '99+' : String(count)
}
