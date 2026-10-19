<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { ReferenceCard, type Reference } from '@/entities/reference'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VSearch } from '@/shared/ui/search'
import { VSelect } from '@/shared/ui/select'
import { referenceSortOptions, referencesLabel, type ReferenceSort } from '../model/product'

// Figma "Card / References" of the product. Add reference opens the edit form at
// References; only the owner gets it.
// TODO(ui): filter sheet and the grid/list toggle — the pool's sheet is built for
// its own filters; the list view isn't designed yet.
const {
  references,
  total,
  addTo = null,
  referenceRoute,
} = defineProps<{
  references: Reference[]
  // All references of the product, before the search.
  total: number
  addTo?: RouteLocationRaw | null
  // The reference page, when the viewer may open it.
  referenceRoute?: (id: string) => RouteLocationRaw | undefined
}>()

const search = defineModel<string>('search', { required: true })
const sort = defineModel<ReferenceSort>('sort', { required: true })

function setSort(value: string | undefined) {
  if (value) sort.value = value as ReferenceSort
}
</script>

<template>
  <section
    class="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-[0_8px_32px_4px_rgb(29_42_60/0.05)] md:shadow-none"
    aria-labelledby="product-references"
  >
    <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-4">
      <div class="flex flex-col gap-3 md:gap-2">
        <h2 id="product-references" class="text-h4 text-primary">References</h2>
        <p class="max-w-[190px] text-p3 font-medium text-secondary md:max-w-none">
          Visual inspiration, examples, and source material for this product.
        </p>
      </div>
      <VButton v-if="addTo" as-child class="h-10.5 w-full gap-1.5 px-5 md:h-10 md:w-auto">
        <RouterLink :to="addTo">
          <VIcon name="plus-sign" />
          Add reference
        </RouterLink>
      </VButton>
    </div>

    <template v-if="total">
      <VSearch
        v-model="search"
        placeholder="Search references…"
        aria-label="Search references"
        class="md:bg-subtle"
      />

      <div class="flex items-center justify-between gap-3">
        <p class="text-p3 font-medium text-secondary">{{ referencesLabel(references.length) }}</p>
        <VSelect
          :model-value="sort"
          :options="referenceSortOptions"
          variant="filter"
          icon="arrow-up-down-sharp"
          aria-label="Sort"
          class="w-[164px]"
          @update:model-value="setSort"
        />
      </div>

      <ul
        v-if="references.length"
        class="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] md:gap-x-4 md:gap-y-5"
      >
        <li v-for="reference in references" :key="reference.id">
          <!-- Favourites live in the pool; the brand can't star at all (docs/adr/0004). -->
          <ReferenceCard
            :reference="reference"
            :to="referenceRoute?.(reference.id)"
            :favorite-toggle="false"
          />
        </li>
      </ul>
      <p v-else class="py-6 text-center text-p2 font-medium text-secondary">
        No references match “{{ search }}”.
      </p>
    </template>

    <!-- TODO(ui): empty state — not in Figma yet. -->
    <p v-else class="py-6 text-center text-p2 font-medium text-secondary">
      No references for this product yet.
    </p>
  </section>
</template>
