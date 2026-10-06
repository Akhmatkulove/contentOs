import { computed, ref } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { toDeliverable } from '@/entities/deliverable'
import { productStatuses, useProduct } from '@/entities/product'
import { toReference } from '@/entities/reference'
import {
  deliveryProgress,
  findDeliverables,
  findReferences,
  moodboardImages,
  productFacts,
  productMeta,
  productTeam,
  type ReferenceSort,
} from './product'
import { queryForTab, tabFromQuery, type ProductTab } from './product-tabs'

// Sections of the edit form that the page's "+" and Edit buttons open.
export type EditSection = 'details' | 'photos' | 'references' | 'deliverables'

// The product page (Figma "Product / Overview" and its tabs). One request
// brings everything; search and sort of the tabs run over it in the browser.
export function useProductPage(id: () => string) {
  const route = useRoute()
  const router = useRouter()

  const { data: product, error, isLoading } = useProduct(id)

  const tab = computed<ProductTab>({
    get: () => tabFromQuery(route.query),
    set: (value) => void router.replace({ query: queryForTab(route.query, value) }),
  })

  // The brand that owns the product edits it; art directors only look.
  const canEdit = computed(() => product.value?.can_edit === true)
  function editRoute(section?: EditSection): RouteLocationRaw {
    return { name: 'product-edit', params: { id: id() }, hash: section ? `#${section}` : '' }
  }

  const status = computed(() => (product.value ? productStatuses[product.value.status] : null))
  const meta = computed(() => (product.value ? productMeta(product.value) : []))
  const facts = computed(() => (product.value ? productFacts(product.value) : []))

  const deliverables = computed(() => (product.value?.deliverables ?? []).map(toDeliverable))
  const progress = computed(() => deliveryProgress(deliverables.value))
  const team = computed(() => productTeam(deliverables.value))
  const moodboard = computed(() => moodboardImages(product.value?.references ?? []))

  const referenceSearch = ref('')
  const referenceSort = ref<ReferenceSort>('newest')
  const references = computed(() =>
    findReferences(product.value?.references ?? [], referenceSearch.value, referenceSort.value).map(
      toReference,
    ),
  )

  const deliverableSearch = ref('')
  const foundDeliverables = computed(() =>
    findDeliverables(deliverables.value, deliverableSearch.value),
  )

  // Nothing to show yet: the very first load.
  const loading = computed(() => isLoading.value && product.value === undefined)
  const notFound = computed(() => error.value?.status === 404)

  return {
    product,
    loading,
    error,
    notFound,
    tab,
    canEdit,
    editRoute,
    status,
    meta,
    facts,
    deliverables,
    progress,
    team,
    moodboard,
    referenceSearch,
    referenceSort,
    references,
    deliverableSearch,
    foundDeliverables,
  }
}
