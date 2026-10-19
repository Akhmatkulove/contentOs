import type { ContentItemResponse, ContentStatus } from '../api/content'

// The status chip of a content card: New until the brand approves the file.
export const contentStatusChip = {
  new: { label: 'New', tone: 'accent' },
  approved: { label: 'Approved', tone: 'success' },
} as const satisfies Record<ContentStatus, { label: string; tone: 'accent' | 'success' }>

// A file in the fullscreen viewer.
export function toMediaFile(item: ContentItemResponse) {
  return { id: item.id, url: item.file.url, kind: item.file.kind }
}
