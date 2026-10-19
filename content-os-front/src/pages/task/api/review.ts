import { http, type Schemas } from '@/shared/api'

export type DeliverableReview = Schemas['DeliverableReviewResponse']
export type ReviewCreator = Schemas['ReviewCreator']
export type ReviewDecision = Schemas['VersionReviewCreate']

// The deliverable as its art director reviews it: every assignee's status and
// submitted versions, newest first; 404 to everyone else (docs/adr/0015).
export async function fetchReview(id: string): Promise<DeliverableReview> {
  return (await http.get<DeliverableReview>(`/tasks/${id}/review`)).data
}

// Approve or Request changes on an assignee's latest version; 409 when a newer
// one came in or the deliverable is already sent.
export async function reviewVersion(
  id: string,
  versionId: string,
  body: ReviewDecision,
): Promise<DeliverableReview> {
  return (await http.post<DeliverableReview>(`/tasks/${id}/versions/${versionId}/review`, body))
    .data
}

// Send to brand: only once every assignee's work is approved, 409 before.
export async function sendToBrand(id: string): Promise<DeliverableReview> {
  return (await http.post<DeliverableReview>(`/tasks/${id}/send`)).data
}
