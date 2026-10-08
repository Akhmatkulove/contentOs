<script setup lang="ts">
import { sortOptions, typeOptions, type Reference } from '@/entities/reference'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VModal } from '@/shared/ui/modal'
import { VSearch } from '@/shared/ui/search'
import { VSelect } from '@/shared/ui/select'
import { useReferencePicker } from '../model/reference-picker'
import SelectableReferenceCard from './SelectableReferenceCard.vue'

// Figma "Modal / Add reference" (Reference bank): the pool with the references
// page's search and filters, shown as SelectableReferenceCard.
const { selected } = defineProps<{ selected: Reference[] }>()

// Closes with the new pick; nothing when cancelled.
const emit = defineEmits<{ close: [picked?: Reference[]] }>()

const {
  search,
  filters,
  options,
  setFilter,
  references,
  picked,
  isPicked,
  setPicked,
  loading,
  failed,
  hasMore,
  loadingMore,
  loadMore,
} = useReferencePicker(selected)

const statusClass = 'py-10 text-center text-p2 font-medium text-secondary'
</script>

<template>
  <!-- Figma: 1075px content, 24px padding and radius. -->
  <VModal
    title="Reference bank"
    description="A shared library of visual references for shoots, products, and creators. Save, organize, and reuse inspiration."
    class="md:max-w-[1123px]"
  >
    <div class="flex flex-col gap-4 md:gap-5">
      <!-- Figma "Toolbar": the filters wrap under the search on narrow screens. -->
      <div class="flex flex-wrap items-center gap-2.5">
        <VSearch
          v-model="search"
          placeholder="Search references"
          aria-label="Search references"
          class="min-w-0 basis-full md:basis-60 md:flex-1"
        />
        <VSelect
          :model-value="filters.type"
          :options="typeOptions"
          variant="filter"
          aria-label="Type"
          class="w-[118px]"
          @update:model-value="setFilter('type', $event)"
        />
        <VSelect
          :model-value="filters.productId"
          :options="options.products"
          variant="filter"
          aria-label="Product"
          searchable
          class="w-[118px]"
          @update:model-value="setFilter('productId', $event)"
        />
        <!-- TODO(ui): All shoots filter — shoots don't exist yet. -->
        <VSelect
          :model-value="filters.authorId"
          :options="options.creators"
          variant="filter"
          aria-label="Creator"
          searchable
          class="w-[118px]"
          @update:model-value="setFilter('authorId', $event)"
        />
        <VSelect
          :model-value="filters.tag"
          :options="options.tags"
          variant="filter"
          aria-label="Tag"
          searchable
          class="w-[118px]"
          @update:model-value="setFilter('tag', $event)"
        />
        <VSelect
          :model-value="filters.sort"
          :options="sortOptions"
          variant="filter"
          icon="arrow-up-down-sharp"
          aria-label="Sort"
          class="w-[164px]"
          @update:model-value="setFilter('sort', $event)"
        />
      </div>

      <p v-if="loading" role="status" :class="statusClass">Loading…</p>
      <p v-else-if="failed" role="status" :class="statusClass">
        Couldn’t load the references. Please try again.
      </p>
      <p v-else-if="!references.length" role="status" :class="statusClass">
        No references match your search or filters.
      </p>

      <template v-else>
        <ul
          class="grid grid-cols-2 gap-x-3 gap-y-4 md:grid-cols-4 md:gap-x-5 md:gap-y-6 lg:grid-cols-5"
        >
          <li v-for="reference in references" :key="reference.id">
            <SelectableReferenceCard
              :reference="reference"
              :selected="isPicked(reference.id)"
              @update:selected="setPicked(reference, $event)"
            />
          </li>
        </ul>

        <VButton
          v-if="hasMore"
          variant="secondary"
          class="self-center"
          :disabled="loadingMore"
          @click="loadMore"
        >
          {{ loadingMore ? 'Loading…' : 'Load more' }}
        </VButton>
      </template>
    </div>

    <template #footer>
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p aria-live="polite" class="text-p3 font-medium text-secondary">
          {{ picked.length }} selected
        </p>
        <div class="flex items-center gap-2.5 md:gap-3">
          <VButton
            variant="secondary"
            class="flex-1 md:w-[150px] md:flex-none"
            @click="emit('close')"
          >
            Cancel
          </VButton>
          <VButton class="flex-1 md:flex-none" @click="emit('close', picked)">
            <VIcon name="tick-01" />
            Save
          </VButton>
        </div>
      </div>
    </template>
  </VModal>
</template>
