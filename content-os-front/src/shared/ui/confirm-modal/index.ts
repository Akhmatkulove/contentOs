import { defineAsyncComponent } from 'vue'
import { openModal } from '@/shared/ui/modal'

// The modal's code loads on first open.
const VConfirmModal = defineAsyncComponent(() => import('./v-confirm-modal.vue'))

interface ConfirmOptions {
  title: string
  description: string
  confirmLabel: string
}

// Asks before an action; resolves with true when confirmed.
export async function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return (await openModal(VConfirmModal, options)) === true
}
