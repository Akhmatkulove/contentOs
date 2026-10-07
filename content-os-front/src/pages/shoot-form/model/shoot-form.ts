import { useRegleSchema } from '@regle/schemas'
import * as v from 'valibot'
import { computed, reactive, ref } from 'vue'
import { demoDeliverables, demoProducts, demoReferences } from './demo'

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

  // rewardEarly: a field turns valid as soon as it is fixed, but invalid only on submit.
  const { r$ } = useRegleSchema(details, shootDetailsSchema, { rewardEarly: true })
  const errors = computed(() => ({
    name: r$.name.$errors[0] ?? '',
    date: r$.date.$errors[0] ?? '',
    startTime: r$.startTime.$errors[0] ?? '',
    duration: r$.duration.$errors[0] ?? '',
  }))

  const products = ref(demoProducts)
  const productSearch = ref('')
  const selectedProducts = ref(products.value.map((product) => product.id))

  const references = ref(demoReferences)
  const referenceSearch = ref('')
  const referenceSource = ref('all')
  const selectedReferences = ref(references.value.map((reference) => reference.id))

  const deliverables = ref(demoDeliverables)
  const selectedDeliverables = ref(deliverables.value.map((item) => item.id))

  // Whether the details passed; the screen moves focus to the first error if not.
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
    references,
    referenceSearch,
    referenceSource,
    selectedReferences,
    deliverables,
    selectedDeliverables,
    submit,
    saveDraft,
  }
}
