import { computed, shallowRef } from 'vue'
import type { Deliverable } from '@/entities/deliverable'
import { toast } from '@/shared/ui/toast'
import { openAddDeliverable } from './add-deliverable'
import type { DeliverableDraft } from './deliverable-draft'

// The product's deliverables: saved ones (when editing) and new ones added
// through the modal. Both go to the backend on save.
export function useDeliverables(productName: () => string) {
  const saved = shallowRef<Deliverable[]>([])
  const drafts = shallowRef<DeliverableDraft[]>([])
  const deliverables = computed<Deliverable[]>(() => [...saved.value, ...drafts.value])

  async function addDeliverable() {
    const draft = await openAddDeliverable({ product: productName() || 'New product' })
    if (!draft) return
    drafts.value = [...drafts.value, draft]
    toast.success('Deliverable added')
  }

  function removeDeliverable(id: string) {
    saved.value = saved.value.filter((item) => item.id !== id)
    drafts.value = drafts.value.filter((item) => item.id !== id)
    toast.success('Deliverable removed')
  }

  return {
    deliverables,
    savedDeliverables: saved,
    deliverableDrafts: drafts,
    addDeliverable,
    removeDeliverable,
  }
}
