<script setup lang="ts">
import { reactive } from 'vue'
import { VButton } from '@/shared/ui/button'
import { VFilterOptions } from '@/shared/ui/filter-options'
import { VModal } from '@/shared/ui/modal'
import type { SelectOption } from '@/shared/ui/select'
import { sortOptions, statusFilterOptions, type ProductFilters } from '../model/product-filters'

// Mobile filters of the products page, same sheet as the references one
// (Figma "Sheet / Filters"). Choices apply only on Apply.
const { filters, collections } = defineProps<{
  filters: ProductFilters
  collections: SelectOption[]
}>()

const emit = defineEmits<{ close: [filters?: ProductFilters] }>()

const draft = reactive({ ...filters })
</script>

<template>
  <VModal title="Filters" hide-title>
    <div class="flex flex-col gap-4">
      <VFilterOptions
        v-model="draft.collection"
        label="Collection"
        :options="collections"
        searchable
      />
      <hr class="border-subtle" />
      <VFilterOptions v-model="draft.status" label="Status" :options="statusFilterOptions" />
      <hr class="border-subtle" />
      <VFilterOptions
        :model-value="draft.sort"
        label="Sort by"
        :options="sortOptions"
        @update:model-value="draft.sort = $event as ProductFilters['sort']"
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
