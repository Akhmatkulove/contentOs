import { http, type Schemas } from '@/shared/api'

export type ShootNote = Schemas['ShootNoteResponse']
export type ShootNoteBody = Schemas['ShootNoteCreate']
export type NoteType = Schemas['NoteType']
export type NoteVisibility = Schemas['NoteVisibility']

// The notes the user may read: pinned first, then newest (docs/adr/0010).
export async function fetchNotes(shootId: string): Promise<ShootNote[]> {
  return (await http.get<ShootNote[]>(`/shoots/${shootId}/notes`)).data
}

export async function createNote(shootId: string, body: ShootNoteBody): Promise<ShootNote> {
  return (await http.post<ShootNote>(`/shoots/${shootId}/notes`, body)).data
}

// The whole edit form; the author's and the art director's only.
export async function updateNote(
  shootId: string,
  noteId: string,
  body: ShootNoteBody,
): Promise<ShootNote> {
  return (await http.put<ShootNote>(`/shoots/${shootId}/notes/${noteId}`, body)).data
}

export async function pinNote(
  shootId: string,
  noteId: string,
  pinned: boolean,
): Promise<ShootNote> {
  return (await http.patch<ShootNote>(`/shoots/${shootId}/notes/${noteId}`, { pinned })).data
}

export async function deleteNote(shootId: string, noteId: string): Promise<void> {
  await http.delete(`/shoots/${shootId}/notes/${noteId}`)
}
