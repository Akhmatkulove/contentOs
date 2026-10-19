import { useMutation, useQueryCache } from '@pinia/colada'
import { useRegleSchema } from '@regle/schemas'
import * as v from 'valibot'
import { computed, reactive, ref, toValue, type MaybeRefOrGetter, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { taskKeys } from '@/entities/deliverable'
import { shootKeys } from '@/entities/shoot'
import { toast } from '@/shared/ui/toast'
import { createShoot, updateShoot } from '../api/shoots'
import { openAddDeliverable } from './add-deliverable'
import { openBrowseProducts } from './browse-products'
import type { ShootDeliverable, ShootProduct, TeamMember } from './shoot-draft'
import { useShootReferences } from './shoot-references'
import type { ShootFormInitial } from './shoot-initial'
import { toShootCreate } from './shoot-request'

// Shoot details: everything but the location is required, as on the server
// (ShootCreate): a name up to 200 characters, a date, a start time and a duration.
export const shootDetailsSchema = v.object({
  name: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('Enter the shoot name.'),
    v.maxLength(200, 'Keep the name under 200 characters.'),
  ),
  date: v.pipe(v.string(), v.nonEmpty('Pick the shoot date.')),
  location: v.string(),
  // The selects hold undefined until something is picked.
  startTime: v.string('Pick the start time.'),
  duration: v.string('Pick the estimated duration.'),
})

// The whole form: the details, at least one ticked product and at least one
// deliverable, each for a ticked product (a product can be unticked after its
// deliverable was added). Deliverables are checked by their products' ids.
export const shootSchema = v.pipe(
  v.object({
    details: shootDetailsSchema,
    productIds: v.pipe(v.array(v.string()), v.minLength(1, 'Select at least one product.')),
    deliverableProductIds: v.pipe(
      v.array(v.string()),
      v.minLength(1, 'Add at least one deliverable.'),
    ),
  }),
  v.forward(
    v.partialCheck(
      [['productIds'], ['deliverableProductIds']],
      ({ productIds, deliverableProductIds }) =>
        deliverableProductIds.every((id) => productIds.includes(id)),
      'A deliverable is for a product that is no longer selected.',
    ),
    ['deliverableProductIds'],
  ),
)

// Who is on the shoot, from useShootTeam().
export interface ShootFormTeam {
  // Creators and mobilographers: the assignees to pick from.
  members: MaybeRefOrGetter<TeamMember[]>
  creatorIds: Ref<string[]>
  mobilographerIds: Ref<string[]>
}

// The form being saved: a new shoot, or an existing one with its id.
export interface ShootFormTarget {
  id: string
  initial: ShootFormInitial
}

// State of the create and edit shoot screens. Saving puts the shoot with
// everything in it and opens the shoot.
export function useShootForm(team: ShootFormTeam, editing?: ShootFormTarget) {
  const initial = editing?.initial
  const details = reactive({
    name: initial?.details.name ?? '',
    // ISO date, YYYY-MM-DD.
    date: initial?.details.date ?? '',
    // Address picked from Yandex suggestions, as text.
    location: initial?.details.location ?? '',
    // "HH:MM", see startTimeOptions.
    startTime: initial?.details.startTime as string | undefined,
    // Minutes as a string, see durationOptions.
    duration: initial?.details.duration as string | undefined,
  })

  // The shoot's products, from "Browse all products"; the ticked ones go into the shoot.
  const products = ref<ShootProduct[]>(initial?.products ?? [])
  const productSearch = ref('')
  const selectedProducts = ref<string[]>((initial?.products ?? []).map((product) => product.id))

  // Deliverables of the shoot: all of them go into it. Removing a saved one
  // deletes it on save.
  const deliverables = ref<ShootDeliverable[]>(initial?.deliverables ?? [])

  // What gets validated. reactive() unwraps the refs, so the form and the
  // section's checkboxes share one list of ticked ids.
  const form = reactive({
    details,
    productIds: selectedProducts,
    deliverableProductIds: computed(() => deliverables.value.map((item) => item.product.id)),
  })
  // rewardEarly: a field turns valid as soon as it is fixed, but invalid only on submit.
  const { r$ } = useRegleSchema(form, shootSchema, { rewardEarly: true })
  const errors = computed(() => ({
    name: r$.details.name.$errors[0] ?? '',
    date: r$.details.date.$errors[0] ?? '',
    startTime: r$.details.startTime.$errors[0] ?? '',
    duration: r$.details.duration.$errors[0] ?? '',
    products: r$.productIds.$errors.$self[0] ?? '',
    deliverables: r$.deliverableProductIds.$errors.$self[0] ?? '',
  }))

  // The modal starts from the ticked products; its pick replaces the list, all ticked.
  async function browseProducts() {
    const ticked = products.value.filter((product) => selectedProducts.value.includes(product.id))
    const picked = await openBrowseProducts(ticked)
    if (!picked) return
    products.value = picked
    selectedProducts.value = picked.map((product) => product.id)
  }

  // New references take their product from the shoot's ticked products.
  const tickedProducts = computed(() =>
    products.value.filter((product) => selectedProducts.value.includes(product.id)),
  )

  const {
    references,
    selected: selectedReferences,
    addReference,
    browse: browseReferences,
  } = useShootReferences(tickedProducts, initial?.references)

  // Picked from what the shoot has now.
  async function addDeliverable() {
    const deliverable = await openAddDeliverable({
      shootId: editing?.id,
      products: tickedProducts.value,
      team: toValue(team.members),
      references: references.value
        .filter((reference) => selectedReferences.value.includes(reference.id))
        .map(({ id, title, previewUrl }) => ({ id, title, previewUrl })),
    })
    if (!deliverable) return
    deliverables.value = [...deliverables.value, deliverable]
    toast.success('Deliverable added')
  }

  function removeDeliverable(id: string) {
    deliverables.value = deliverables.value.filter((item) => item.id !== id)
    toast.success('Deliverable removed')
  }

  const router = useRouter()
  const queryCache = useQueryCache()

  // New references are already in the pool: they were saved when added (docs/adr/0006).
  const { mutate: create, isLoading: saving } = useMutation({
    mutation: async (validated: { details: v.InferOutput<typeof shootDetailsSchema> }) => {
      const body = toShootCreate({
        details: validated.details,
        creatorIds: team.creatorIds.value,
        mobilographerIds: team.mobilographerIds.value,
        productIds: selectedProducts.value,
        referenceIds: selectedReferences.value,
        deliverables: deliverables.value,
      })
      if (!editing) return { id: (await createShoot(body)).id }
      const saved = await updateShoot(editing.id, body)
      // The shoot page opens with what the server saved, without a refetch.
      queryCache.setQueryData(shootKeys.detail(saved.id), saved)
      return { id: saved.id }
    },
    onSuccess: async ({ id }) => {
      // The list, its tab counts and Next shoot show the change; the deliverables
      // are tasks. Not the saved shoot: it is already in the cache.
      await Promise.all([
        queryCache.invalidateQueries({ key: shootKeys.lists }),
        queryCache.invalidateQueries({ key: taskKeys.all }),
      ])
      toast.success(editing ? 'Changes saved' : 'Shoot created')
      await router.push({ name: 'shoot', params: { id } })
    },
  })

  // Whether the form passed; the screen moves focus to the first error if not.
  async function submit(): Promise<boolean> {
    if (saving.value) return true
    const { valid, data } = await r$.$validate()
    if (valid) create(data)
    return valid
  }

  return {
    details,
    errors,
    products,
    productSearch,
    selectedProducts,
    browseProducts,
    references,
    selectedReferences,
    addReference,
    browseReferences,
    deliverables,
    addDeliverable,
    removeDeliverable,
    submit,
    saving,
  }
}
