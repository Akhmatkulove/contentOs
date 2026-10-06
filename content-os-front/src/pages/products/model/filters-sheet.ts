import { defineAsyncComponent } from 'vue'
import type { SelectOption } from '@/shared/ui/select'
import { openModal } from '@/shared/ui/modal'
import type { ProductFilters } from './product-filters'

// The sheet's code loads on first open.
const FiltersSheet = defineAsyncComponent(() => import('../ui/FiltersSheet.vue'))

// Mobile filters: resolves with the applied filters, or undefined when cancelled.
export function openFiltersSheet(filters: ProductFilters, collections: SelectOption[]) {
  return openModal(FiltersSheet, { filters, collections })
}
