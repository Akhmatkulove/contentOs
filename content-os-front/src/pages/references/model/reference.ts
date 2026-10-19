import { linkHost } from '@/entities/reference'
import type { IconName } from '@/shared/ui/icon'
import type { ReferenceDetails } from '../api/references'

export type ReferenceFile = ReferenceDetails['files'][number]

const typeLabels = {
  image: 'Image',
  video: 'Video',
  moodboard: 'Moodboard',
} as const satisfies Record<NonNullable<ReferenceDetails['type']>, string>

// The page heading: a link without a title goes by its site.
export function referenceTitle(reference: ReferenceDetails): string {
  return reference.title || (reference.link ? linkHost(reference.link) : 'Untitled')
}

// ISO timestamp → "Oct 19, 2026", in the viewer's timezone.
export function addedLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

// "3 images · 1 video"; "Link" for a reference without files.
export function filesLabel(files: ReferenceFile[]): string {
  if (!files.length) return 'Link'
  const videos = files.filter((file) => file.kind === 'video').length
  const images = files.length - videos
  return [images && plural(images, 'image'), videos && plural(videos, 'video')]
    .filter(Boolean)
    .join(' · ')
}

// The rows of the Details card, only those with a value.
export function referenceFacts(reference: ReferenceDetails): { label: string; value: string }[] {
  const facts = [
    { label: 'Type', value: reference.type ? typeLabels[reference.type] : '' },
    { label: 'Content', value: filesLabel(reference.files) },
    { label: 'Creator', value: reference.author ?? '' },
    { label: 'Collection', value: reference.collection ?? '' },
    { label: 'Added', value: addedLabel(reference.created_at) },
  ]
  return facts.filter((fact) => fact.value)
}

// The site's own icon on a link reference, where the sprite has one.
export function linkIcon(link: string): IconName {
  const host = linkHost(link)
  if (/(^|\.)instagram\.com$/.test(host)) return 'instagram'
  if (/(^|\.)tiktok\.com$/.test(host)) return 'tiktok'
  if (/(^|\.)pinterest\.[a-z.]+$|(^|\.)pin\.it$/.test(host)) return 'pinterest'
  return 'link-01'
}

// Columns of the gallery for its width: wide enough to make out details, never
// more than there are files. A single file gets the whole width.
export const MIN_COLUMN = 300

export function galleryColumns(width: number, count: number, gap: number): number {
  const fit = Math.floor((width + gap) / (MIN_COLUMN + gap))
  return Math.max(1, Math.min(fit, 3, count))
}

// Files dealt into columns left to right, row by row, so reading order and the
// viewer's order match. Each keeps its index in the reference.
export function dealColumns<T>(items: T[], columns: number): { item: T; index: number }[][] {
  const result = Array.from({ length: columns }, () => [] as { item: T; index: number }[])
  items.forEach((item, index) => result[index % columns]!.push({ item, index }))
  return result
}
