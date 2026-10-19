import { useQuery } from '@pinia/colada'
import { computed } from 'vue'
import { taskKeys } from '@/entities/deliverable'
import { queryParam, useQueryParams, type QueryParams } from '@/shared/lib'
import {
  fetchBrandDeliverableFilters,
  fetchBrandDeliverables,
  type BrandDeliverableSort,
} from '../api/brand-deliverables'
import {
  brandDeliverableTabs,
  brandDeliverableTabValues,
  toBrandDeliverable,
  type BrandDeliverableTabValue,
} from './brand-deliverable'
import { taskSortOptions } from './task'

export const BRAND_DELIVERABLES_PER_PAGE = 20

// Reka Select can't hold an empty value, so "All …" is this sentinel.
const ALL = 'all'

const sortValues = taskSortOptions.map((option) => option.value)

// The list's state in the URL, next to view=brand:
// /tasks?view=brand&tab=not_scheduled&brand=…&sort=due_date&page=2.
const brandDeliverableQueryParams = {
  search: queryParam.text(),
  tab: queryParam.oneOf(brandDeliverableTabValues, 'all'),
  product: queryParam.text(),
  brand: queryParam.text(),
  sort: queryParam.oneOf(sortValues, 'priority'),
  page: queryParam.page(),
} satisfies QueryParams

type IdFilter = 'product' | 'brand'

// The art director's backlog on My tasks (docs/adr/0019): brands' deliverables
// assigned to them, with whether a shoot closes them yet. The server searches,
// filters and pages.
export function useBrandDeliverablesList() {
  const { state: query, update } = useQueryParams(brandDeliverableQueryParams, { page: 'page' })

  const search = computed({
    get: () => query.search,
    set: (value) => (query.search = value),
  })
  const page = computed({
    get: () => query.page,
    set: (value) => (query.page = value),
  })
  const tab = computed({
    get: () => query.tab,
    set: (value: string) => update({ tab: value as BrandDeliverableTabValue }),
  })
  const sort = computed({
    get: (): BrandDeliverableSort => query.sort,
    set: (value: string | undefined) =>
      update({ sort: (value || 'priority') as BrandDeliverableSort }),
  })
  // VSelect shows the "All …" option for ''.
  const idFilter = (key: IdFilter) =>
    computed({
      get: () => query[key] || ALL,
      set: (value: string | undefined) => update({ [key]: !value || value === ALL ? '' : value }),
    })

  const { data, isLoading } = useQuery({
    key: () => taskKeys.brandDeliverables({ ...query }),
    query: () =>
      fetchBrandDeliverables({
        search: query.search,
        status: query.tab === 'all' ? undefined : query.tab,
        productId: query.product || undefined,
        brandId: query.brand || undefined,
        sort: query.sort,
        page: query.page,
        perPage: BRAND_DELIVERABLES_PER_PAGE,
      }),
    // Keep the current page on screen while the next one loads.
    placeholderData: (previous) => previous,
  })

  const { data: filterData } = useQuery({
    key: taskKeys.brandDeliverableFilters,
    query: fetchBrandDeliverableFilters,
  })
  const options = (items: { id: string; name: string | null }[] | undefined, all: string) => [
    { value: ALL, label: all },
    ...(items ?? []).map((item) => ({ value: item.id, label: item.name || 'Unnamed' })),
  ]
  const productOptions = computed(() => options(filterData.value?.products, 'All products'))
  const brandOptions = computed(() => options(filterData.value?.brands, 'All brands'))

  const today = new Date()
  const deliverables = computed(() =>
    (data.value?.items ?? []).map((item) => toBrandDeliverable(item, today)),
  )
  const total = computed(() => data.value?.total ?? 0)
  const tabs = computed(() => brandDeliverableTabs(data.value?.counts))
  // Nothing to show yet: the very first load.
  const loading = computed(() => isLoading.value && data.value === undefined)

  return {
    search,
    tab,
    tabs,
    sort,
    product: idFilter('product'),
    brand: idFilter('brand'),
    productOptions,
    brandOptions,
    deliverables,
    total,
    loading,
    page,
  }
}
