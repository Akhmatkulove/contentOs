import { shallowRef } from 'vue'
import { openAddDeliverable } from './add-deliverable'
import type { DeliverableDraft } from './deliverable-draft'

// The product's deliverables, added through the modal and listed in the table.
// They are saved with the product by Create product.
export function useDeliverables(productName: () => string) {
  const deliverables = shallowRef<DeliverableDraft[]>([])

  async function addDeliverable() {
    const draft = await openAddDeliverable({ product: productName() || 'New product' })
    if (draft) deliverables.value = [...deliverables.value, draft]
  }

  function removeDeliverable(id: string) {
    deliverables.value = deliverables.value.filter((draft) => draft.id !== id)
  }

  return {
    deliverables,
    addDeliverable,
    removeDeliverable,
  }
}
