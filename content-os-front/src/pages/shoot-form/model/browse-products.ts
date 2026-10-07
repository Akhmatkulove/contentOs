import { defineAsyncComponent } from 'vue'
import { openModal } from '@/shared/ui/modal'
import type { ShootProduct } from './shoot-draft'

// The modal's code loads on first open.
const BrowseProductsModal = defineAsyncComponent(() => import('../ui/BrowseProductsModal.vue'))

// Opens "Browse all products" with the shoot's products ticked. Resolves with the
// new pick, or undefined when cancelled.
export function openBrowseProducts(selected: ShootProduct[]) {
  return openModal(BrowseProductsModal, { selected })
}
