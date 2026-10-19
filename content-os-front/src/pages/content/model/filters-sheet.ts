import { defineAsyncComponent } from 'vue'
import { openModal } from '@/shared/ui/modal'
import type { ContentFilters, FilterOptions } from './content-filters'

// The sheet's code loads on first open.
const FiltersSheet = defineAsyncComponent(() => import('../ui/FiltersSheet.vue'))

// Mobile filters: resolves with the applied filters, or undefined when cancelled.
export function openFiltersSheet(
  filters: ContentFilters,
  options: FilterOptions,
  showShoots: boolean,
) {
  return openModal(FiltersSheet, { filters, options, showShoots })
}
