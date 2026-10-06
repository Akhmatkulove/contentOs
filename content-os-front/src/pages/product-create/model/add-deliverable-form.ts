import { useQuery } from '@pinia/colada'
import { useRegleSchema } from '@regle/schemas'
import * as v from 'valibot'
import { computed, reactive } from 'vue'
import type { SelectOption } from '@/shared/ui/select'
import { fetchArtDirectors, type TeamMember } from '../api/team'
import type { DeliverableDraft, DeliverableStatus } from './deliverable-draft'

export const deliverableSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.nonEmpty('Enter the deliverable.')),
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
    assigneeId: undefined as string | undefined,
    status: 'to_shoot' as DeliverableStatus | undefined,
    dueDate: '',
    brief: '',
  })

  // rewardEarly: a field turns valid as soon as it is fixed, but turns invalid only on submit.
  const { r$ } = useRegleSchema(form, deliverableSchema, { rewardEarly: true })
  const errors = computed(() => ({
    name: r$.name.$errors[0] ?? '',
    assigneeId: r$.assigneeId.$errors[0] ?? '',
  }))

  const { data: artDirectors, isLoading: assigneesLoading } = useQuery({
    key: ['team', 'art-directors'],
    query: fetchArtDirectors,
  })
  const assignees = computed(() => assigneeOptions(artDirectors.value ?? []))

  // VSelect emits a plain string; it only offers deliverableStatusOptions.
  function chooseStatus(status: string | undefined) {
    form.status = status as DeliverableStatus | undefined
  }

  // The draft to hand to the page, or null while the form is invalid.
  async function submit(): Promise<DeliverableDraft | null> {
    const { valid, data } = await r$.$validate()
    if (!valid) return null
    return {
      id: crypto.randomUUID(),
      name: data.name,
      assignee: artDirectors.value?.find((member) => member.id === data.assigneeId) ?? null,
      status: form.status ?? 'to_shoot',
      dueDate: form.dueDate,
      brief: data.brief,
    }
  }

  return { form, errors, assignees, assigneesLoading, chooseStatus, submit }
}
