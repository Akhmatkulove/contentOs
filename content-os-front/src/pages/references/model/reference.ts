import { linkHost, type Reference } from '@/entities/reference'
import type { Schemas } from '@/shared/api'

type ReferenceResponse = Schemas['ReferenceResponse']

// A pool reference as ReferenceCard shows it. The preview is the first image;
// videos have none yet (docs/adr/0003).
export function toReference(item: ReferenceResponse): Reference {
  const videoCount = item.files.filter((file) => file.kind === 'video').length
  const first = item.files[0]
  return {
    id: item.id,
    title: item.title || (item.link ? linkHost(item.link) : 'Untitled'),
    kind: item.type === 'video' || first?.kind === 'video' ? 'video' : 'image',
    author: item.author ?? '',
    previewUrl: item.files.find((file) => file.kind === 'image')?.url ?? null,
    // TODO(api): video duration — not computed yet (needs ffmpeg).
    durationSec: null,
    imageCount: item.files.length - videoCount,
    videoCount,
    tags: item.tags,
    favorite: item.favorite,
  }
}
