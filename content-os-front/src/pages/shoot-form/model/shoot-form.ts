import { reactive, ref } from 'vue'
import { demoDeliverables, demoProducts, demoReferences, demoTeam } from './demo'
import type { TeamMember } from './shoot-draft'

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

  const team = reactive({
    artDirector: demoTeam.artDirector as TeamMember | null,
    creators: [...demoTeam.creators],
    mobilographer: demoTeam.mobilographer as TeamMember | null,
  })

  function removeCreator(id: string) {
    team.creators = team.creators.filter((creator) => creator.id !== id)
  }

  const products = ref(demoProducts)
  const productSearch = ref('')
  const selectedProducts = ref(products.value.map((product) => product.id))

  const references = ref(demoReferences)
  const referenceSearch = ref('')
  const referenceSource = ref('all')
  const selectedReferences = ref(references.value.map((reference) => reference.id))

  const deliverables = ref(demoDeliverables)
  const selectedDeliverables = ref(deliverables.value.map((item) => item.id))

  // TODO(api): POST the shoot, then open it.
  function submit() {}
  // TODO(api): save the shoot as a draft.
  function saveDraft() {}

  return {
    details,
    team,
    removeCreator,
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
