import { type DeliverableStatus } from '@/entities/deliverable'
import { errorMessage, type ApiError } from '@/shared/api'
import type { TaskFileResponse, TaskVersionResponse } from '../api/task'

export interface ContentFile {
  id: string
  name: string
  // "12.4 MB".
  size: string
  url: string
  video: boolean
  // While uploading: 0–100.
  progress?: number
  // The upload failed; `retryable` when trying again may help.
  failed?: UploadFailure
}

export interface UploadFailure {
  message: string
  retryable: boolean
}

// A version of the Ready content card (Figma "Version / V1").
export interface ContentVersion {
  id: string
  // The title the creator gave it, or "V2".
  label: string
  // "Uploaded Sep 18, 14:22".
  uploaded: string
  files: ContentFile[]
  // Only the latest version carries the task's review state.
  status: { label: string; tone: 'warning' | 'danger' | 'success' } | null
}

// The latest upload's state as Figma names it on the version.
const versionStatuses: Partial<Record<DeliverableStatus, ContentVersion['status']>> = {
  needs_review: { label: 'On review', tone: 'warning' },
  needs_changes: { label: 'Needs changes', tone: 'danger' },
  approved: { label: 'Approved', tone: 'success' },
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

// Sent share 0–1 → percent. The server still checks and converts the file
// after the last byte, so 100 waits for its answer.
export function uploadPercent(sent: number, done: boolean): number {
  if (done) return 100
  return Math.min(99, Math.max(0, Math.round(sent * 100)))
}

// Why a file didn't upload. A file the server refused (wrong type, too large)
// fails again the same way; a lost connection or a server hiccup may not.
export function uploadFailure(error: ApiError): UploadFailure {
  if (error.status === 422) return { message: error.message, retryable: false }
  if (error.status === 413) return { message: errorMessage(error), retryable: false }
  return { message: 'Upload failed', retryable: true }
}

export function failedUploadsMessage(count: number): string {
  return count === 1 ? 'A file didn’t upload.' : `${count} files didn’t upload.`
}

// Seconds → "0:15", "1:05".
export function durationLabel(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

export function toFile(file: TaskFileResponse): ContentFile {
  return {
    id: file.id,
    name: file.name || (file.kind === 'video' ? 'Video' : 'Photo'),
    size: fileSizeLabel(file.size),
    url: file.url,
    video: file.kind === 'video',
  }
}

// Submitted versions come newest first; they don't change any more.
export function toVersions(
  versions: TaskVersionResponse[],
  status: DeliverableStatus,
): ContentVersion[] {
  return versions.map((version, index) => ({
    id: version.id,
    label: version.title || `V${version.number}`,
    uploaded: uploadedLabel(version.submitted_at ?? version.created_at),
    files: version.files.map(toFile),
    status: index === 0 ? (versionStatuses[status] ?? null) : null,
  }))
}
