import { useRegleSchema } from '@regle/schemas'
import * as v from 'valibot'
import { computed, reactive } from 'vue'
import type { DeliverableStatus, DeliverableType } from '@/entities/deliverable'
import type { SelectOption } from '@/shared/ui/select'
import type { DeliverableContext } from './add-deliverable'
import { toggleSelection, type ShootDeliverable } from './shoot-draft'
import { membersByIds } from './shoot-team'

// The deliverable, its type and its product are required; assignees, references, date
// and status are not. Without picked references the deliverable gets all of
// the shoot's. Same rules as ShootDeliverableDraft on the backend.
export const shootDeliverableSchema = v.object({
  name: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('Enter the deliverable.'),
    v.maxLength(200, 'Keep the name under 200 characters.'),
  ),
  type: v.picklist(['video', 'image'], 'Select a type.'),
  productId: v.pipe(v.string('Select a product.'), v.nonEmpty('Select a product.')),
})

export function productOptions(context: DeliverableContext): SelectOption[] {
  return context.products.map((product) => ({ value: product.id, label: product.name }))
}

export function useAddDeliverableForm(context: DeliverableContext) {
  const form = reactive({
    name: '',
    type: undefined as DeliverableType | undefined,
    productId: undefined as string | undefined,
    assigneeIds: [] as string[],
    referenceIds: [] as string[],
    dueDate: '',
    status: 'to_shoot' as DeliverableStatus,
  })

  // rewardEarly: a field turns valid as soon as it is fixed, but turns invalid only on submit.
  const { r$ } = useRegleSchema(form, shootDeliverableSchema, { rewardEarly: true })
  const errors = computed(() => ({
    name: r$.name.$errors[0] ?? '',
    type: r$.type.$errors[0] ?? '',
    productId: r$.productId.$errors[0] ?? '',
  }))

  // In the order they were picked.
  const assignees = computed(() => membersByIds(context.team, form.assigneeIds))
  const references = computed(() =>
    form.referenceIds.flatMap((id) => context.references.find((item) => item.id === id) ?? []),
  )

  function toggleAssignee(id: string) {
    form.assigneeIds = toggleSelection(form.assigneeIds, id, !form.assigneeIds.includes(id))
  }
  function toggleReference(id: string) {
    form.referenceIds = toggleSelection(form.referenceIds, id, !form.referenceIds.includes(id))
  }

  // The deliverable to hand to the shoot, or null while the form is invalid.
  async function submit(): Promise<ShootDeliverable | null> {
    const { valid, data } = await r$.$validate()
    if (!valid) return null
    // The select only offers the context's products, so the pick is among them.
    const product = context.products.find((item) => item.id === data.productId)
    if (!product) return null
    return {
      id: crypto.randomUUID(),
      name: data.name,
      type: data.type,
      product,
      references: references.value.length ? references.value : context.references,
      assignees: assignees.value,
      dueDate: form.dueDate,
      status: form.status,
    }
  }

  return {
    form,
    errors,
    assignees,
    references,
    toggleAssignee,
    toggleReference,
    submit,
  }
}
