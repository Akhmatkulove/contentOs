import { uploadFile } from '@/shared/api'
import { uploadAll } from '@/shared/lib'
import { createReference, type ReferenceCreate, type SavedReference } from '../api/references'
import { toRequest, type ReferenceDraft } from './reference-draft'

// The draft as the pool's request, once its files are uploaded.
export function toCreateRequest(draft: ReferenceDraft, fileIds: string[]): ReferenceCreate {
  return {
    ...toRequest(draft, fileIds),
    product_id: draft.productId ?? null,
    collection: draft.collection || null,
    favorite: draft.favorite,
  }
}

// Uploads the draft's files (three at a time), then creates the reference in
// the pool; the author is the user.
export async function saveReference(draft: ReferenceDraft): Promise<SavedReference> {
  const uploaded = await uploadAll(draft.files, uploadFile)
  return createReference(
    toCreateRequest(
      draft,
      uploaded.map((file) => file.id),
    ),
  )
}
