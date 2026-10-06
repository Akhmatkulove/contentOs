import { linkHost, type Reference } from '@/entities/reference'
import type { ReferenceDraft } from '@/features/add-reference'
import { isVideo } from '@/shared/lib'

// A reference added on the product page is kept in memory until the product is
// created; then its files are uploaded and it goes with the product.
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
