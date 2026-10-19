import {
  toContentFile,
  uploadedLabel,
  versionLabel,
  versionStatus,
  type ContentFile as SavedFile,
  type ContentVersionResponse,
  type VersionStatus,
} from '@/entities/deliverable'
import { errorMessage, type ApiError } from '@/shared/api'

// A file of the draft or of a version; while uploading it carries its progress.
export interface ContentFile extends SavedFile {
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
  // Whose version it is, when the list has several authors.
  author: string | null
  // "Uploaded Sep 18, 14:22".
  uploaded: string
  files: ContentFile[]
  // The art director's decision; the latest version waits for it "On review".
  status: VersionStatus | null
  // What the art director asked to change (or said on approving).
  feedback: string | null
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

// Submitted versions come newest first; they don't change any more. The
// assignee sees their own; the art director everyone's, so each author's
// latest waits on review and the card names whose it is.
export function toVersions(versions: ContentVersionResponse[]): ContentVersion[] {
  const authors = new Set(versions.map((version) => version.author.id))
  const seen = new Set<string>()
  return versions.map((version) => {
    const latest = !seen.has(version.author.id)
    seen.add(version.author.id)
    return {
      id: version.id,
      label: versionLabel(version),
      author: authors.size > 1 ? (version.author.name ?? 'Unnamed') : null,
      uploaded: uploadedLabel(version.submitted_at ?? version.created_at),
      files: version.files.map(toContentFile),
      status: versionStatus(version.review, latest, 'On review'),
      feedback: version.feedback,
    }
  })
}
