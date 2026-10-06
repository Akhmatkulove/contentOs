import type { Schemas } from '@/shared/api'

export type ReferenceSource = 'upload' | 'link'
export type ReferenceType = Schemas['ReferenceType']

// What "Add reference" returns: the reference before its files are uploaded.
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
  // Picked in the modal when the screen doesn't fix them (the pool).
  productId: string | undefined
  collection: string
  favorite: boolean
}

// The common part of the request once the draft's files are uploaded.
export function toRequest(draft: ReferenceDraft, fileIds: string[]): Schemas['ReferenceDraft'] {
  return {
    title: draft.title || null,
    type: draft.type ?? null,
    tags: draft.tags,
    notes: draft.notes || null,
    ...(draft.source === 'upload' ? { file_ids: fileIds } : { link: draft.link }),
  }
}
