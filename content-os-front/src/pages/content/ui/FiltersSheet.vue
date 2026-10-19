<script setup lang="ts">
import { reactive } from 'vue'
import { VButton } from '@/shared/ui/button'
import { VFilterOptions } from '@/shared/ui/filter-options'
import { VModal } from '@/shared/ui/modal'
import {
  sortOptions,
  statusOptions,
  type ContentFilters,
  type FilterOptions as Options,
} from '../model/content-filters'

// Figma "Sheet / Filters" (mobile), as on the references page. Choices apply only on Apply.
const { filters, options, showShoots } = defineProps<{
  filters: ContentFilters
  options: Options
  // false for a brand: it doesn't see shoots.
  showShoots: boolean
}>()

const emit = defineEmits<{ close: [filters?: ContentFilters] }>()

const draft = reactive({ ...filters })
</script>

<template>
  <VModal title="Filters" hide-title>
    <div class="flex flex-col gap-4">
      <VFilterOptions
        v-model="draft.productId"
        label="Product"
        :options="options.products"
        searchable
      />
      <template v-if="showShoots">
        <hr class="border-subtle" />
        <VFilterOptions
          v-model="draft.shootId"
          label="Shoot"
          :options="options.shoots"
          searchable
        />
      </template>
      <hr class="border-subtle" />
      <VFilterOptions
        v-model="draft.authorId"
        label="Creator"
        :options="options.creators"
        searchable
      />
      <hr class="border-subtle" />
      <VFilterOptions v-model="draft.status" label="Status" :options="statusOptions" />
      <hr class="border-subtle" />
      <VFilterOptions
        :model-value="draft.sort"
        label="Sort by"
        :options="sortOptions"
        @update:model-value="draft.sort = $event as ContentFilters['sort']"
      />
    </div>

    <template #footer>
      <div class="flex gap-2.5">
        <VButton variant="secondary" class="flex-1" @click="emit('close')">Cancel</VButton>
        <VButton class="flex-1" @click="emit('close', { ...draft })">Apply</VButton>
      </div>
    </template>
  </VModal>
</template>
