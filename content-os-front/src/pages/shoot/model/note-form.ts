import { useRegleSchema } from '@regle/schemas'
import * as v from 'valibot'
import { computed, reactive } from 'vue'
import type { NoteType, NoteVisibility, ShootNote, ShootNoteBody } from '../api/notes'
import type { TeamMember } from './shoot'

// The note as the server takes it (ShootNoteCreate): a title up to 200
// characters and a text up to 5000.
export const noteSchema = v.object({
  title: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('Enter a title.'),
    v.maxLength(200, 'Keep the title under 200 characters.'),
  ),
  body: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('Write the note.'),
    v.maxLength(5000, 'Keep the note under 5000 characters.'),
  ),
})

// The New note / Edit note form. `note`: the note being edited.
export function useNoteForm(team: TeamMember[], note?: ShootNote) {
  const form = reactive({
    title: note?.title ?? '',
    type: (note?.type ?? 'general') as NoteType,
    visibility: (note?.visibility ?? 'internal') as NoteVisibility,
    body: note?.body ?? '',
    pinned: note?.pinned ?? false,
    assigneeIds: note?.assignees.map((member) => member.id) ?? [],
  })

  // rewardEarly: a field turns valid as soon as it is fixed, but invalid only on submit.
  const { r$ } = useRegleSchema(form, noteSchema, { rewardEarly: true })
  const errors = computed(() => ({
    title: r$.title.$errors[0] ?? '',
    body: r$.body.$errors[0] ?? '',
  }))

  // In the order they were picked; people who left the team drop out.
  const assignees = computed(() =>
    form.assigneeIds.flatMap((id) => team.find((member) => member.id === id) ?? []),
  )

  function toggleAssignee(id: string) {
    form.assigneeIds = form.assigneeIds.includes(id)
      ? form.assigneeIds.filter((item) => item !== id)
      : [...form.assigneeIds, id]
  }

  // VSelect emits a plain string; each select only offers its own options.
  function chooseType(value: string | undefined) {
    if (value) form.type = value as NoteType
  }
  function chooseVisibility(value: string | undefined) {
    if (value) form.visibility = value as NoteVisibility
  }

  // The request, or null while the form is invalid.
  async function submit(): Promise<ShootNoteBody | null> {
    const { valid, data } = await r$.$validate()
    if (!valid) return null
    return {
      title: data.title,
      body: data.body,
      type: form.type,
      visibility: form.visibility,
      pinned: form.pinned,
      assignee_ids: assignees.value.map((member) => member.id),
    }
  }

  return { form, errors, assignees, toggleAssignee, chooseType, chooseVisibility, submit }
}
