import { computed, ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { toDeliverable } from '@/entities/deliverable'
import { productStatuses, useProduct } from '@/entities/product'
import { toReference } from '@/entities/reference'
import { useSessionStore } from '@/entities/session'
import { useQueryParams } from '@/shared/lib'
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
import { productQueryParams, type ProductTab } from './product-tabs'

// Sections of the edit form that the page's "+" and Edit buttons open.
export type EditSection = 'details' | 'photos' | 'references' | 'deliverables'

// The product page (Figma "Product / Overview" and its tabs). One request
// brings everything; search and sort of the tabs run over it in the browser.
export function useProductPage(id: () => string) {
  const { data: product, error, isLoading } = useProduct(id)

  const { state: query } = useQueryParams(productQueryParams)
  const tab = computed<ProductTab>({
    get: () => query.tab,
    set: (value) => (query.tab = value),
  })

  // The brand that owns the product edits it; art directors only look.
  const canEdit = computed(() => product.value?.can_edit === true)
  // What the "…" menu needs: Archive is off while shoots work on it.
  const actionsTarget = computed(() =>
    product.value
      ? { id: product.value.id, status: product.value.status, inWork: product.value.in_work }
      : null,
  )
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

  // The reference page is the team's (the pool); a brand stays on the product.
  const session = useSessionStore()
  function referenceRoute(referenceId: string): RouteLocationRaw | undefined {
    return session.me?.role === 'brand'
      ? undefined
      : { name: 'reference', params: { id: referenceId } }
  }

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
    actionsTarget,
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
    referenceRoute,
    deliverableSearch,
    foundDeliverables,
  }
}
