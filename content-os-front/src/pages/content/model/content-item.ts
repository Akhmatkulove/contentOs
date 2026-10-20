import type { ContentStatus } from '../api/content'

// The status chip of a content card: New until the brand approves the file.
export const contentStatusChip = {
  new: { label: 'New', tone: 'accent' },
  approved: { label: 'Approved', tone: 'success' },
} as const satisfies Record<ContentStatus, { label: string; tone: 'accent' | 'success' }>
