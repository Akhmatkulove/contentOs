import { useQuery } from '@pinia/colada'
import { useRegleSchema } from '@regle/schemas'
import * as v from 'valibot'
import { computed, reactive, watch } from 'vue'
import {
  deliverableStatusOptions,
  type DeliverableStatus,
  type DeliverableType,
} from '@/entities/deliverable'
import { shootKeys } from '@/entities/shoot'
import type { SelectOption } from '@/shared/ui/select'
import { fetchProductDeliverables, type ProductDeliverableOption } from '../api/shoots'
import type { DeliverableContext } from './add-deliverable'
import { firstAndMore, toggleSelection, type ShootDeliverable } from './shoot-draft'
import { membersByIds } from './shoot-team'

// The deliverable, its type and the brand's deliverable it closes (which gives
// the product) are required; assignees, references, date and status are not.
// Without picked references the deliverable gets all of the shoot's. Same rules
// as ShootDeliverableDraft on the backend.
export const shootDeliverableSchema = v.object({
  productDeliverableId: v.pipe(
    v.string('Select the product deliverable.'),
    v.nonEmpty('Select the product deliverable.'),
  ),
  name: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('Enter the deliverable.'),
    v.maxLength(200, 'Keep the name under 200 characters.'),
  ),
  type: v.picklist(['video', 'image'], 'Select a type.'),
})

// Approved means sent to the brand: only the review does that, after every
// assignee's work is approved (docs/adr/0015).
export const statusOptions = deliverableStatusOptions.filter(
  (option) => option.value !== 'approved',
)

// "Black Abaya 042 · Hero reel", by the ticked products' order, plus
// "· In Shoot 04" when another shoot already closes it (docs/adr/0017).
export function productDeliverableOptions(
  context: DeliverableContext,
  items: ProductDeliverableOption[],
): SelectOption[] {
  return context.products.flatMap((product) =>
    items
      .filter((item) => item.product_id === product.id)
      .map((item) => {
        const shoots = item.shoots.filter((shoot) => shoot.id !== context.shootId)
        const planned = firstAndMore(shoots.map((shoot) => shoot.name))
        const label = `${product.name} · ${item.name}`
        return { value: item.id, label: planned ? `${label} · In ${planned}` : label }
      }),
  )
}

export function useAddDeliverableForm(context: DeliverableContext) {
  const form = reactive({
    productDeliverableId: undefined as string | undefined,
    name: '',
    type: undefined as DeliverableType | undefined,
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
    productDeliverableId: r$.productDeliverableId.$errors[0] ?? '',
  }))

  // The brand's deliverables of the ticked products assigned to the art director.
  const productIds = context.products.map((product) => product.id)
  const { data: assigned, isLoading } = useQuery({
    key: () => shootKeys.productDeliverables(productIds),
    query: () => fetchProductDeliverables(productIds),
    enabled: () => productIds.length > 0,
  })
  const productDeliverables = computed(() =>
    productDeliverableOptions(context, assigned.value ?? []),
  )
  const picked = computed(() =>
    assigned.value?.find((item) => item.id === form.productDeliverableId),
  )
  // Picking fills in the brand's name, type and due date, unless they were
  // changed by hand since the previous pick.
  watch(picked, (next, previous) => {
    if (!next) return
    if (!form.name || form.name === previous?.name) form.name = next.name
    if (!form.type || form.type === previous?.type) form.type = next.type
    if (!form.dueDate || form.dueDate === (previous?.due_date ?? '')) {
      form.dueDate = next.due_date ?? ''
    }
  })

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
    // The select only offers the ticked products' deliverables, so the pick is among them.
    const closes = picked.value
    const product = context.products.find((item) => item.id === closes?.product_id)
    if (!closes || !product) return null
    return {
      id: crypto.randomUUID(),
      name: data.name,
      type: data.type,
      product,
      productDeliverable: { id: closes.id, name: closes.name },
      references: references.value.length ? references.value : context.references,
      assignees: assignees.value,
      dueDate: form.dueDate,
      status: form.status,
    }
  }

  return {
    form,
    errors,
    productDeliverables,
    loadingProductDeliverables: isLoading,
    assignees,
    references,
    toggleAssignee,
    toggleReference,
    submit,
  }
}
