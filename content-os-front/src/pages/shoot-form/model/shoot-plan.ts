import { useQuery } from '@pinia/colada'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { fetchProduct, productKeys, type ProductDetails } from '@/entities/product'
import type { ShootProduct } from './shoot-draft'

// Plan shoot from the art director's backlog (docs/adr/0019): a new shoot that
// starts with the product ticked and the brand's deliverable ready in Add
// deliverable.
export interface ShootPlan {
  product: ShootProduct
  productDeliverableId: string
}

export function toShootPlan(product: ProductDetails, productDeliverableId: string): ShootPlan {
  return {
    product: {
      id: product.id,
      name: product.name,
      collection: product.collection ?? '',
      photoUrl: product.photos[0]?.url ?? null,
      archived: product.status === 'archived',
    },
    productDeliverableId,
  }
}

// /shoots/new?product=…&deliverable=…. Without them, or if the product can't be
// loaded, the form starts empty.
export function useShootPlan() {
  const route = useRoute()
  const read = (key: string) => (typeof route.query[key] === 'string' ? route.query[key] : '')
  const productId = computed(() => read('product'))
  const productDeliverableId = computed(() => read('deliverable'))
  const wanted = computed(() => Boolean(productId.value && productDeliverableId.value))

  const { data, isLoading } = useQuery({
    key: () => productKeys.detail(productId.value),
    query: () => fetchProduct(productId.value),
    enabled: () => wanted.value,
    // The form opens empty instead.
    meta: { toast: false },
  })

  const plan = computed(() =>
    wanted.value && data.value ? toShootPlan(data.value, productDeliverableId.value) : undefined,
  )
  // The form reads its starting state once: wait for the product.
  const waiting = computed(() => wanted.value && isLoading.value && !data.value)
  return { plan, waiting }
}
