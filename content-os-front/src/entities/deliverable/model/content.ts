import type { Schemas } from '@/shared/api'

// Ready content of a shoot deliverable: the versions an assignee submits and
// the art director reviews (docs/adr/0012, 0015).

export type ContentFileResponse = Schemas['TaskFile']
export type ContentVersionResponse = Schemas['TaskVersionResponse']
export type VersionReview = Schemas['VersionReview']

export interface ContentFile {
  id: string
  name: string
  // "12.4 MB".
  size: string
  url: string
  video: boolean
}

export interface VersionStatus {
  label: string
  tone: 'warning' | 'danger' | 'success'
}

// 12_400_000 → "11.8 MB"; small files in KB.
export function fileSizeLabel(bytes: number): string {
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

// ISO timestamp → "Uploaded Sep 18, 14:22", in the viewer's timezone.
export function uploadedLabel(iso: string): string {
  const date = new Date(iso)
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `Uploaded ${day}, ${time}`
}

// Seconds → "0:15", "1:05".
export function durationLabel(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

export function toContentFile(file: ContentFileResponse): ContentFile {
  return {
    id: file.id,
    name: file.name || (file.kind === 'video' ? 'Video' : 'Photo'),
    size: fileSizeLabel(file.size),
    url: file.url,
    video: file.kind === 'video',
  }
}

// The version's title, or "V2".
export function versionLabel(version: Pick<ContentVersionResponse, 'title' | 'number'>): string {
  return version.title || `V${version.number}`
}

// An author's work waits for the art director while none of their versions is
// picked (approved) and one has no decision yet (docs/adr/0016).
// `versions` are one author's submitted ones.
export function workWaits(versions: Pick<ContentVersionResponse, 'review'>[]): boolean {
  return (
    versions.some(({ review }) => review === null) &&
    !versions.some(({ review }) => review === 'approved')
  )
}

// The art director's decision on a submitted version. Undecided ones wait for
// it while the author's work does (`waits`): any of them can be picked.
// `waiting` names that wait: "On review" for the creator, "Needs review" for
// the art director.
export function versionStatus(
  review: VersionReview | null,
  waits: boolean,
  waiting: string,
): VersionStatus | null {
  if (review === 'approved') return { label: 'Approved', tone: 'success' }
  if (review === 'changes_requested') return { label: 'Needs changes', tone: 'danger' }
  return waits ? { label: waiting, tone: 'warning' } : null
}
