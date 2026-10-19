import * as v from 'valibot'
import {
  deliverableStatuses,
  toContentFile,
  uploadedLabel,
  versionLabel,
  versionStatus,
  type ContentFile,
  type DeliverableStatus,
  type VersionReview,
  type VersionStatus,
} from '@/entities/deliverable'
import { toReference } from '@/entities/reference'
import type { Schemas } from '@/shared/api'
import type { DeliverableReview, ReviewCreator } from '../api/review'

// Same limit as the backend (VersionReviewCreate.feedback).
export const FEEDBACK_MAX = 1000

// Approve or Request changes; asking for changes needs a word on what to change.
export const decisionSchema = v.pipe(
  v.object({
    decision: v.picklist(['approved', 'changes_requested']),
    feedback: v.pipe(
      v.string(),
      v.trim(),
      v.maxLength(FEEDBACK_MAX, `Keep the feedback under ${FEEDBACK_MAX} characters.`),
    ),
  }),
  v.forward(
    v.partialCheck(
      [['decision'], ['feedback']],
      (input) => input.decision !== 'changes_requested' || input.feedback !== '',
      'Tell the creator what to change.',
    ),
    ['feedback'],
  ),
) satisfies v.GenericSchema<Schemas['VersionReviewCreate']>

// A submitted version as the review shows it (Figma "Version / V1").
export interface ReviewVersion {
  id: string
  label: string
  // "Uploaded Sep 18, 14:22".
  uploaded: string
  files: ContentFile[]
  status: VersionStatus | null
  review: VersionReview | null
  feedback: string | null
  // Decisions go on the latest version only; the rest is history.
  latest: boolean
}

// An assignee's work on the deliverable: one tab of the creator switcher.
export interface CreatorWork {
  id: string
  name: string
  photoUrl: string | null
  // "Creator", "Mobilographer"; null once they left the shoot's team.
  role: string | null
  status: DeliverableStatus
  versions: ReviewVersion[]
}

const roles = { creator: 'Creator', mobilographer: 'Mobilographer' } as const

function toWork(creator: ReviewCreator): CreatorWork {
  return {
    id: creator.member.id,
    name: creator.member.name ?? 'Unnamed',
    photoUrl: creator.member.photo_url,
    role: creator.role ? roles[creator.role] : null,
    status: creator.status,
    versions: creator.versions.map((version, index) => ({
      id: version.id,
      label: versionLabel(version),
      uploaded: uploadedLabel(version.submitted_at ?? version.created_at),
      files: version.files.map(toContentFile),
      status: versionStatus(version.review, index === 0, 'Needs review'),
      review: version.review,
      feedback: version.feedback,
      latest: index === 0,
    })),
  }
}

export function toCreators(review: DeliverableReview): CreatorWork[] {
  return review.creators.map(toWork)
}

// The creator picked in the URL; without one (or a stale one), the first whose
// work waits for review, so the page opens on what needs the art director.
export function pickCreator(creators: CreatorWork[], wanted: string): CreatorWork | null {
  return (
    creators.find((creator) => creator.id === wanted) ??
    creators.find((creator) => creator.status === 'needs_review') ??
    creators[0] ??
    null
  )
}

// The picked version, or the latest one.
export function pickVersion(
  versions: ReviewVersion[],
  wanted: string | null,
): ReviewVersion | null {
  return versions.find((version) => version.id === wanted) ?? versions[0] ?? null
}

export function isSent(review: DeliverableReview): boolean {
  return review.status === 'approved'
}

// What the creator's status reads like next to their name.
export function creatorStatus(status: DeliverableStatus) {
  return status === 'to_shoot' || status === 'in_progress'
    ? { label: 'Not uploaded yet', tone: 'info' as const }
    : deliverableStatuses[status]
}

// Under Send to brand: why it can't go yet, creator by creator.
export function waitingReason(creator: CreatorWork): string | null {
  switch (creator.status) {
    case 'approved':
      return null
    case 'needs_review':
      return `${creator.name}’s work needs your review`
    case 'needs_changes':
      return `${creator.name} is making changes`
    default:
      return `${creator.name} hasn’t uploaded yet`
  }
}

export function approvedLabel(creators: CreatorWork[]): string {
  const approved = creators.filter((creator) => creator.status === 'approved').length
  return `${approved} of ${creators.length} approved`
}

// The newest submitted version across all assignees, "Uploaded Sep 18, 14:22".
export function lastUploaded(review: DeliverableReview): string | null {
  const times = review.creators.flatMap((creator) =>
    creator.versions.slice(0, 1).map((version) => version.submitted_at ?? version.created_at),
  )
  if (!times.length) return null
  return uploadedLabel(
    times.reduce((latest, time) => (Date.parse(time) > Date.parse(latest) ? time : latest)),
  )
}

// Figma "Reference" card: the deliverable's first reference.
export function firstReference(review: DeliverableReview) {
  const [first] = review.references
  if (!first) return null
  const card = toReference(first)
  return { id: card.id, title: card.title, previewUrl: card.previewUrl }
}
