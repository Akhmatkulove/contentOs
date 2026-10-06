<script setup lang="ts">
import { reactive } from 'vue'
import { VButton } from '@/shared/ui/button'
import { VModal } from '@/shared/ui/modal'
import {
  sortOptions,
  typeOptions,
  type FilterOptions as Options,
  type ReferenceFilters,
} from '../model/reference-filters'
import FilterOptions from './FilterOptions.vue'

// Figma "Sheet / Filters" (mobile). Choices apply only on Apply.
// TODO(ui): Shoot section — shoots don't exist yet.
const { filters, options } = defineProps<{ filters: ReferenceFilters; options: Options }>()

const emit = defineEmits<{ close: [filters?: ReferenceFilters] }>()

const draft = reactive({ ...filters })
</script>

<template>
  <VModal title="Filters" hide-title>
    <div class="flex flex-col gap-4">
      <FilterOptions v-model="draft.type" label="Type" :options="typeOptions" />
      <hr class="border-subtle" />
      <FilterOptions
        v-model="draft.productId"
        label="Product"
        :options="options.products"
        searchable
      />
      <hr class="border-subtle" />
      <FilterOptions
        v-model="draft.authorId"
        label="Creator"
        :options="options.creators"
        searchable
      />
      <hr class="border-subtle" />
      <FilterOptions v-model="draft.tag" label="Tags" :options="options.tags" searchable />
      <hr class="border-subtle" />
      <FilterOptions
        :model-value="draft.sort"
        label="Sort by"
        :options="sortOptions"
        @update:model-value="draft.sort = $event as ReferenceFilters['sort']"
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
