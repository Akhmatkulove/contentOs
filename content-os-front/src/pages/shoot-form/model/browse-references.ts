import { defineAsyncComponent } from 'vue'
import type { Reference } from '@/entities/reference'
import { openModal } from '@/shared/ui/modal'

// The modal's code loads on first open.
const ReferenceBankModal = defineAsyncComponent(() => import('../ui/ReferenceBankModal.vue'))

// Opens "Reference bank" with the shoot's references ticked. Resolves with the
// new pick, or undefined when cancelled.
export function openReferenceBank(selected: Reference[]) {
  return openModal(ReferenceBankModal, { selected })
}
