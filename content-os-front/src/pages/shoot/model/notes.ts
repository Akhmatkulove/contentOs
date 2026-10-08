import type { SelectOption } from '@/shared/ui/select'
import type { NoteType, NoteVisibility, ShootNote } from '../api/notes'
import { ALL } from './shoot'

export const noteTypeOptions = [
  { value: 'general', label: 'General' },
  { value: 'creative', label: 'Creative direction' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'post_production', label: 'Post-production' },
] as const satisfies readonly (SelectOption & { value: NoteType })[]

export const noteVisibilityOptions = [
  { value: 'internal', label: 'Internal' },
  { value: 'private', label: 'Private' },
] as const satisfies readonly (SelectOption & { value: NoteVisibility })[]

// What each visibility means, under the select.
export const visibilityHints: Record<NoteVisibility, string> = {
  internal: 'The whole shoot team sees this note.',
  private: 'Only you, the people assigned and the art director see it.',
}

// "All notes" plus one entry per type.
export const noteFilterOptions = [
  { value: ALL, label: 'All notes' },
  { value: 'pinned', label: 'Pinned' },
  ...noteTypeOptions,
] as const satisfies readonly SelectOption[]

export type NoteFilter = (typeof noteFilterOptions)[number]['value']

// Search by title, text and author; the filter picks pinned notes or a type.
export function findNotes(notes: ShootNote[], search: string, filter: NoteFilter): ShootNote[] {
  const query = search.trim().toLocaleLowerCase()
  return notes.filter(
    (note) =>
      (filter === ALL || (filter === 'pinned' ? note.pinned : note.type === filter)) &&
      [note.title, note.body, note.author.name ?? ''].join(' ').toLocaleLowerCase().includes(query),
  )
}

// Each non-empty line of a note is one bullet (Figma shows notes as lists).
export function noteLines(body: string): string[] {
  return body
    .split('\n')
    .map((line) => line.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean)
}

// "Sep 18, 2024, 16:20" in the user's time zone.
export function noteDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
