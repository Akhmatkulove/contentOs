import { useRegleSchema } from '@regle/schemas'
import * as v from 'valibot'
import { computed, reactive, ref } from 'vue'
import { openBrowseProducts } from './browse-products'
import type { Reference } from '@/entities/reference'
import { openReferenceBank } from './browse-references'
import { demoDeliverables } from './demo'
import type { ShootProduct } from './shoot-draft'

// Shoot details: everything but the location is required.
// TODO(api): match the rules to the shoots API once it exists.
export const shootDetailsSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.nonEmpty('Enter the shoot name.')),
  date: v.pipe(v.string(), v.nonEmpty('Pick the shoot date.')),
  location: v.string(),
  // The selects hold undefined until something is picked.
  startTime: v.string('Pick the start time.'),
  duration: v.string('Pick the estimated duration.'),
})

// The whole form: the details and at least one ticked product.
export const shootSchema = v.object({
  details: shootDetailsSchema,
  productIds: v.pipe(v.array(v.string()), v.minLength(1, 'Select at least one product.')),
})

// State of the create-shoot screen. Layout stage: the screen holds what the
// user picks; saving, pickers and searches come next.
// TODO(api): create the shoot, save a draft, load products and references.
export function useShootForm() {
  const details = reactive({
    name: '',
    // ISO date, YYYY-MM-DD.
    date: '',
    // Address picked from Yandex suggestions, as text.
    location: '',
    // "HH:MM", see startTimeOptions.
    startTime: undefined as string | undefined,
    // Minutes as a string, see durationOptions.
    duration: undefined as string | undefined,
  })

  // The shoot's products, from "Browse all products"; the ticked ones go into the shoot.
  const products = ref<ShootProduct[]>([])
  const productSearch = ref('')
  const selectedProducts = ref<string[]>([])

  // What gets validated. reactive() unwraps the ref, so the form and the
  // section's checkboxes share one list of ticked ids.
  const form = reactive({ details, productIds: selectedProducts })
  // rewardEarly: a field turns valid as soon as it is fixed, but invalid only on submit.
  const { r$ } = useRegleSchema(form, shootSchema, { rewardEarly: true })
  const errors = computed(() => ({
    name: r$.details.name.$errors[0] ?? '',
    date: r$.details.date.$errors[0] ?? '',
    startTime: r$.details.startTime.$errors[0] ?? '',
    duration: r$.details.duration.$errors[0] ?? '',
    products: r$.productIds.$errors.$self[0] ?? '',
  }))

  // The modal starts from the ticked products; its pick replaces the list, all ticked.
  async function browseProducts() {
    const ticked = products.value.filter((product) => selectedProducts.value.includes(product.id))
    const picked = await openBrowseProducts(ticked)
    if (!picked) return
    products.value = picked
    selectedProducts.value = picked.map((product) => product.id)
  }

  // The shoot's references, from "Browse reference bank"; the ticked ones go into the shoot.
  const references = ref<Reference[]>([])
  const selectedReferences = ref<string[]>([])

  // The bank starts from the ticked references; its pick replaces the list, all ticked.
  async function browseReferences() {
    const ticked = references.value.filter((reference) =>
      selectedReferences.value.includes(reference.id),
    )
    const picked = await openReferenceBank(ticked)
    if (!picked) return
    references.value = picked
    selectedReferences.value = picked.map((reference) => reference.id)
  }

  const deliverables = ref(demoDeliverables)
  const selectedDeliverables = ref(deliverables.value.map((item) => item.id))

  // Whether the form passed; the screen moves focus to the first error if not.
  // TODO(api): POST the shoot with `data`, then open it.
  async function submit(): Promise<boolean> {
    const { valid } = await r$.$validate()
    return valid
  }
  // A draft may stay incomplete: no validation.
  // TODO(api): save the shoot as a draft.
  function saveDraft() {}

  return {
    details,
    errors,
    products,
    productSearch,
    selectedProducts,
    browseProducts,
    references,
    selectedReferences,
    browseReferences,
    deliverables,
    selectedDeliverables,
    submit,
    saveDraft,
  }
}
