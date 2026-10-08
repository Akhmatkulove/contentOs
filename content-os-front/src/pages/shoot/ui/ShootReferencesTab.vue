<script setup lang="ts">
import { computed } from 'vue'
import { ReferenceCard, type Reference } from '@/entities/reference'
import { VIcon } from '@/shared/ui/icon'
import { VSearch } from '@/shared/ui/search'
import { VSelect, type SelectOption } from '@/shared/ui/select'
import {
  referenceSortOptions,
  referenceTypeOptions,
  usageLabel,
  type ReferenceFilters,
} from '../model/references-tab'

// Figma "Shoot / References": the shoot's references as the usual reference
// cards, with search, filters and sort.
// TODO(ui): "All sources" filter (Instagram, TikTok, Uploaded…) and the mobile
// filters sheet.
const { references, total, products, uses } = defineProps<{
  references: Reference[]
  total: number
  products: SelectOption[]
  // Reference id → how many of the shoot's deliverables follow it.
  uses: Map<string, number>
}>()

const filters = defineModel<ReferenceFilters>('filters', { required: true })

const search = computed({
  get: () => filters.value.search,
  set: (value: string) => (filters.value = { ...filters.value, search: value }),
})

// The filters are the page's: a change replaces them rather than editing the prop.
function set<K extends keyof ReferenceFilters>(key: K, value: ReferenceFilters[K]) {
  filters.value = { ...filters.value, [key]: value }
}

const linked = computed(
  () => `${total} ${total === 1 ? 'reference' : 'references'} linked to this shoot`,
)
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <section
      aria-label="Search and filters"
      class="flex flex-wrap items-center gap-2.5 rounded-2xl bg-card p-4 shadow-[0_8px_32px_4px_rgb(29_42_60/0.05)] md:p-3 md:shadow-none"
    >
      <VSearch
        v-model="search"
        placeholder="Search references…"
        aria-label="Search references"
        class="min-w-0 flex-1 md:min-w-60"
      />
      <div class="hidden flex-wrap items-center gap-2.5 md:flex">
        <VSelect
          :model-value="filters.productId"
          :options="products"
          variant="filter"
          aria-label="Product"
          class="w-[160px]"
          @update:model-value="set('productId', $event)"
        />
        <VSelect
          :model-value="filters.type"
          :options="referenceTypeOptions"
          variant="filter"
          aria-label="Type"
          class="w-[148px]"
          @update:model-value="set('type', $event)"
        />
        <VSelect
          :model-value="filters.sort"
          :options="referenceSortOptions"
          variant="filter"
          aria-label="Sort"
          class="w-[160px]"
          @update:model-value="set('sort', $event)"
        />
      </div>
    </section>

    <!-- Figma "Card / Attached references". -->
    <section
      aria-labelledby="attached-references"
      class="flex flex-col gap-4 rounded-2xl bg-card p-4 md:gap-5 md:p-5"
    >
      <div class="flex flex-col gap-1">
        <h2 id="attached-references" class="text-h6 text-primary">Attached references</h2>
        <p class="text-p3 font-medium text-secondary">{{ linked }}</p>
      </div>
      <ul
        v-if="references.length"
        class="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-x-4 md:gap-y-5 xl:grid-cols-5"
      >
        <li v-for="reference in references" :key="reference.id" class="min-w-0">
          <ReferenceCard :reference="reference" :favorite-toggle="false">
            <template #footer>
              <p class="flex items-center gap-1.5 text-p4 font-medium text-secondary">
                <VIcon
                  :name="uses.get(reference.id) ? 'link-01' : 'user'"
                  :size="14"
                  class="shrink-0"
                />
                {{ usageLabel(uses.get(reference.id) ?? 0) }}
              </p>
            </template>
          </ReferenceCard>
        </li>
      </ul>
      <p v-else class="py-6 text-center text-p2 font-medium text-secondary">
        {{ total ? 'No references match the search or filters.' : 'No references in this shoot.' }}
      </p>
    </section>
  </div>
</template>
