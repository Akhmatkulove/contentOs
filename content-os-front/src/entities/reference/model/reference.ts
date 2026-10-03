// TODO(api): replace with the reference type from `Schemas` once the backend
// has a references endpoint.
export type ReferenceKind = 'video' | 'image'

export interface Reference {
  id: string
  title: string
  kind: ReferenceKind
  author: string
  previewUrl: string | null
  // Videos only; null for images.
  durationSec: number | null
  tags: string[]
  favorite: boolean
}

export const referenceKindLabels = {
  video: 'Video',
  image: 'Image',
} as const satisfies Record<ReferenceKind, string>

// Video length on the preview badge: 28 → "0:28", 3725 → "1:02:05".
export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = String(sec % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}
