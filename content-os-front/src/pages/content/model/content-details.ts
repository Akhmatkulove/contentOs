import type { Role } from '@/entities/session'
import { roleLabels } from '@/entities/session'
import type { Schemas } from '@/shared/api'
import type { MediaFile } from '@/shared/ui/media-viewer'
import { linkHost, referenceKindLabels, toReference } from '@/entities/reference'
import type {
  ContentComment,
  ContentDetails,
  ContentMaterial,
  ContentReference,
} from '../api/content'

type ShootRole = Schemas['ShootRole']

// Thumbnail slots under the stage, as in Figma: five across. With more files
// the fifth turns into "+N", which opens the rest in the viewer.
export const RAIL_SLOTS = 5

export interface Rail {
  shown: ContentMaterial[]
  // Files behind the "+N" tile; 0 — no tile.
  more: number
}

export function rail(materials: ContentMaterial[], slots = RAIL_SLOTS): Rail {
  if (materials.length <= slots) return { shown: materials, more: 0 }
  return { shown: materials.slice(0, slots - 1), more: materials.length - (slots - 1) }
}

export function toMediaFiles(materials: ContentMaterial[]): MediaFile[] {
  return materials.map((material) => ({
    id: material.id,
    url: material.file.url,
    kind: material.file.kind,
  }))
}

// The file the page opens on: the one tapped in the content list, else the first.
export function startIndex(materials: ContentMaterial[], fileId: unknown): number {
  const index = materials.findIndex((material) => material.id === fileId)
  return Math.max(0, index)
}

// "Creator", "Mobilographer"; someone no longer in the shoot's team shot it as a creator.
export const shootRoleLabels = {
  creator: 'Creator',
  mobilographer: 'Mobilographer',
} as const satisfies Record<ShootRole, string>

export function shootRoleLabel(role: ShootRole | null): string {
  return shootRoleLabels[role ?? 'creator']
}

// The signature under a commenter's name: "Brand", "Art Director".
export function commentRole(role: Role): string {
  return roleLabels[role]
}

// ISO → "Sep 18, 14:45", in the viewer's timezone.
export function shortDateTime(iso: string): string {
  const date = new Date(iso)
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${day}, ${time}`
}

// ISO → "Sep 18, 2024 at 14:22".
export function longDateTime(iso: string): string {
  const date = new Date(iso)
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${day} at ${time}`
}

// YYYY-MM-DD → "Sep 18, 2024", the calendar date as stored.
export function calendarDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year!, month! - 1, day!).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Under the title: "Cream Dress 011 • Shoot 04 — Autumn Drop"; the brand sees no shoot.
export function contentSubtitle(content: Pick<ContentDetails, 'product' | 'shoot'>): string[] {
  return content.shoot ? [content.product.name, content.shoot.name] : [content.product.name]
}

// Under the deliverable's name in Details: "Video · 3 files".
export function deliverableHint(content: Pick<ContentDetails, 'type' | 'materials'>): string {
  const count = content.materials.length
  const kind = content.type === 'video' ? 'Video' : 'Image'
  return `${kind} · ${count} ${count === 1 ? 'file' : 'files'}`
}

// One line of the comments feed: a comment, or the brand's approval among them.
export type FeedEntry =
  | { kind: 'comment'; key: string; comment: ContentComment }
  | { kind: 'approved'; key: 'approved'; at: string }

// Newest first; the approval sits where it happened in time.
export function commentFeed(comments: ContentComment[], approvedAt: string | null): FeedEntry[] {
  const entries: FeedEntry[] = comments.map((comment) => ({
    kind: 'comment',
    key: comment.id,
    comment,
  }))
  if (approvedAt === null) return entries
  const approvedTime = new Date(approvedAt).getTime()
  const index = comments.findIndex(
    (comment) => new Date(comment.created_at).getTime() <= approvedTime,
  )
  const approval: FeedEntry = { kind: 'approved', key: 'approved', at: approvedAt }
  entries.splice(index === -1 ? entries.length : index, 0, approval)
  return entries
}

// The composer sends on Enter; Shift+Enter breaks the line, and Enter that
// confirms an IME composition (Korean, Japanese…) doesn't send.
export function sendsOnKey(
  event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'isComposing'>,
): boolean {
  return event.key === 'Enter' && !event.shiftKey && !event.isComposing
}

// Same limit as the backend.
export const COMMENT_MAX = 2000

// References in the sidebar; "View all" leads to the product's References tab.
export const SIDEBAR_REFERENCES = 3

// Under a reference's title: "Video reference", "Image reference · 4 files",
// or where a link leads: "instagram.com".
export function referenceHint(reference: ContentReference): string {
  const files = reference.files.length
  if (!files && reference.link) return linkHost(reference.link)
  const kind = `${referenceKindLabels[toReference(reference).kind]} reference`
  return files > 1 ? `${kind} · ${files} files` : kind
}
