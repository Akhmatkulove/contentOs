import { http, type Schemas } from '@/shared/api'

export type TaskDetails = Schemas['TaskResponse']
export type TaskVersionResponse = Schemas['TaskVersionResponse']
export type TaskFileResponse = Schemas['TaskFile']

// The task with its submitted versions, newest first, and the assignees' draft;
// 404 when it isn't the user's task (docs/adr/0012).
export async function fetchTask(id: string): Promise<TaskDetails> {
  return (await http.get<TaskDetails>(`/tasks/${id}`)).data
}

// Files already sent to /uploads go into the draft of the next version (V1,
// V2, …); the first ones create it. The assignees' only.
export async function addDraftFiles(id: string, fileIds: string[]): Promise<TaskDetails> {
  return (await http.post<TaskDetails>(`/tasks/${id}/draft/files`, { file_ids: fileIds })).data
}

// Save draft: the draft's title, without sending it to review; 409 without a draft.
export async function saveDraft(id: string, title: string): Promise<TaskDetails> {
  return (await http.patch<TaskDetails>(`/tasks/${id}/draft`, { title })).data
}

// Submit for review: the draft becomes a version, the task goes to review.
export async function submitDraft(id: string, title: string): Promise<TaskDetails> {
  return (await http.post<TaskDetails>(`/tasks/${id}/draft/submit`, { title })).data
}

// Only from the draft; a draft left empty goes away.
export async function removeDraftFile(id: string, fileId: string): Promise<TaskDetails> {
  return (await http.delete<TaskDetails>(`/tasks/${id}/draft/files/${fileId}`)).data
}
