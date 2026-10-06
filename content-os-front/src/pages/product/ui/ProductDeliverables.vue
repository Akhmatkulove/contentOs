<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { deliverablesLabel, DeliverablesTable, type Deliverable } from '@/entities/deliverable'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VSearch } from '@/shared/ui/search'
import DeliverableRows from './DeliverableRows.vue'

// Figma "Card / Deliverables" of the product: a header card with search and
// Add deliverable (owner only, opens the edit form), then the list card.
// TODO(ui): filter sheet — not designed for the product page yet.
const {
  deliverables,
  total,
  addTo = null,
} = defineProps<{
  deliverables: Deliverable[]
  // All deliverables of the product, before the search.
  total: number
  addTo?: RouteLocationRaw | null
}>()

const search = defineModel<string>('search', { required: true })
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <!-- Mobile: heading, search, button (Figma order); desktop: the button to the
         right of the heading, the search under both. -->
    <section
      class="flex flex-col gap-3 rounded-2xl bg-card p-5 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-x-4 md:gap-y-4"
      aria-labelledby="product-deliverables"
    >
      <div class="flex flex-col gap-2">
        <h2 id="product-deliverables" class="text-h4 text-primary">Deliverables</h2>
        <p class="text-p3 font-medium text-secondary">
          Plan and track the content pieces required for this product.
        </p>
      </div>
      <VSearch
        v-if="total"
        v-model="search"
        placeholder="Search deliverables…"
        aria-label="Search deliverables"
        class="md:col-span-2 md:bg-subtle"
      />
      <VButton
        v-if="addTo"
        as-child
        class="h-10.5 w-full gap-1.5 px-5 md:col-start-2 md:row-start-1 md:h-10 md:w-auto"
      >
        <RouterLink :to="addTo">
          <VIcon name="plus-sign" />
          Add deliverable
        </RouterLink>
      </VButton>
    </section>

    <section
      aria-label="Deliverables list"
      class="flex flex-col rounded-2xl bg-card px-5 pt-1.5 pb-2 md:py-2"
    >
      <template v-if="deliverables.length">
        <DeliverableRows :deliverables="deliverables" class="md:hidden" />
        <DeliverablesTable :deliverables="deliverables" class="hidden md:block" />
      </template>
      <p v-else class="py-6 text-center text-p2 font-medium text-secondary">
        {{ total ? `No deliverables match “${search}”.` : 'No deliverables for this product yet.' }}
      </p>
      <p class="flex h-10 items-center border-t border-subtle text-p3 font-medium text-secondary">
        {{ deliverablesLabel(deliverables.length) }}
      </p>
    </section>
  </div>
</template>
