import { defineAsyncComponent } from 'vue'
import type { FilterOptions, ReferenceFilters } from '@/entities/reference'
import { openModal } from '@/shared/ui/modal'

// The sheet's code loads on first open.
const FiltersSheet = defineAsyncComponent(() => import('../ui/FiltersSheet.vue'))

// Mobile filters: resolves with the applied filters, or undefined when cancelled.
export function openFiltersSheet(filters: ReferenceFilters, options: FilterOptions) {
  return openModal(FiltersSheet, { filters, options })
}
