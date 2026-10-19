import { useQuery } from '@pinia/colada'
import { useRegleSchema } from '@regle/schemas'
import * as v from 'valibot'
import { computed, reactive } from 'vue'
import type { DeliverableStatus, DeliverableType } from '@/entities/deliverable'
import type { SelectOption } from '@/shared/ui/select'
import { fetchArtDirectors, type TeamMember } from '../api/team'
import type { DeliverableDraft } from './deliverable-draft'

export const deliverableSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.nonEmpty('Enter the deliverable.')),
  type: v.picklist(['video', 'image'], 'Select a type.'),
  assigneeId: v.pipe(v.string('Select an assignee.'), v.nonEmpty('Select an assignee.')),
  brief: v.pipe(v.string(), v.trim()),
})

// Art directors as assignee options; a member without a name shows as "Unnamed".
export function assigneeOptions(members: TeamMember[]): SelectOption[] {
  return members.map((member) => ({ value: member.id, label: member.name || 'Unnamed' }))
}

export function useAddDeliverableForm() {
  const form = reactive({
    name: '',
    type: undefined as DeliverableType | undefined,
    assigneeId: undefined as string | undefined,
    status: 'to_shoot' as DeliverableStatus,
    dueDate: '',
    brief: '',
  })

  // rewardEarly: a field turns valid as soon as it is fixed, but turns invalid only on submit.
  const { r$ } = useRegleSchema(form, deliverableSchema, { rewardEarly: true })
  const errors = computed(() => ({
    name: r$.name.$errors[0] ?? '',
    type: r$.type.$errors[0] ?? '',
    assigneeId: r$.assigneeId.$errors[0] ?? '',
  }))

  const { data: artDirectors, isLoading: assigneesLoading } = useQuery({
    key: ['team', 'art-directors'],
    query: fetchArtDirectors,
  })
  const assignees = computed(() => assigneeOptions(artDirectors.value ?? []))

  // The draft to hand to the page, or null while the form is invalid.
  async function submit(): Promise<DeliverableDraft | null> {
    const { valid, data } = await r$.$validate()
    if (!valid) return null
    // The select only offers loaded art directors, so the pick is among them.
    const assignee = artDirectors.value?.find((member) => member.id === data.assigneeId)
    if (!assignee) return null
    return {
      id: crypto.randomUUID(),
      name: data.name,
      type: data.type,
      assignee,
      status: form.status,
      dueDate: form.dueDate,
      brief: data.brief,
    }
  }

  return { form, errors, assignees, assigneesLoading, submit }
}
