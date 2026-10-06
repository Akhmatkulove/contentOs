import { linkHost, type Reference } from '@/entities/reference'
import type { Schemas } from '@/shared/api'
import { isVideo } from './uploads'

export type ReferenceSource = 'upload' | 'link'
export type ReferenceType = Schemas['ReferenceType']

// A reference added on the product page. Kept in memory until the product is
// created; then its files are uploaded and it goes with the product.
export interface ReferenceDraft {
  id: string
  source: ReferenceSource
  // One or several: several make one reference, like a moodboard.
  files: File[]
  link: string
  title: string
  type: ReferenceType | undefined
  tags: string[]
  notes: string
}

// What the backend gets once the draft's files are uploaded.
export function toRequest(draft: ReferenceDraft, fileIds: string[]): Schemas['ReferenceDraft'] {
  return {
    title: draft.title || null,
    type: draft.type ?? null,
    tags: draft.tags,
    notes: draft.notes || null,
    ...(draft.source === 'upload' ? { file_ids: fileIds } : { link: draft.link }),
  }
}

// The draft as a ReferenceCard shows it. `previewUrl` is the page's object URL
// of the first image; videos and links have no preview yet.
export function draftCard(
  draft: ReferenceDraft,
  author: string,
  previewUrl: string | null,
): Reference {
  const files = draft.source === 'upload' ? draft.files : []
  const videoCount = files.filter(isVideo).length
  const first = draft.files[0]
  return {
    id: draft.id,
    title: draft.title || first?.name || linkHost(draft.link),
    kind: draft.type === 'video' || (first && isVideo(first)) ? 'video' : 'image',
    author,
    previewUrl,
    durationSec: null,
    imageCount: files.length - videoCount,
    videoCount,
    tags: draft.tags,
    favorite: false,
  }
}

// The file to preview on the card: the first image, if any.
export function previewFile(draft: ReferenceDraft): File | undefined {
  return draft.files.find((file) => !isVideo(file))
}
