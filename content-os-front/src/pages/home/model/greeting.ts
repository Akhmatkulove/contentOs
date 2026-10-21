// "Good morning" until noon, "Good afternoon" until 6 pm, then "Good evening".
export function greeting(now: Date): string {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

// "Tue, Sep 10, 2024".
export function todayLabel(now: Date): string {
  return now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Midnight of the 1st of the month, in the user's time zone.
export function monthStart(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1)
}
