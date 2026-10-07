<script setup lang="ts">
import { VButton } from '@/shared/ui/button'
import { VCheckbox } from '@/shared/ui/checkbox'
import { VIcon } from '@/shared/ui/icon'
import { VModal } from '@/shared/ui/modal'
import { VSearch } from '@/shared/ui/search'
import { useProductPicker } from '../model/product-picker'
import type { ShootProduct } from '../model/shoot-draft'
import MediaPreview from './MediaPreview.vue'

// "Browse all products": Figma "Modal / Add reference" (Reference bank) with
// products instead of references and only the search in the toolbar.
const { selected } = defineProps<{ selected: ShootProduct[] }>()

// Closes with the new pick; nothing when cancelled.
const emit = defineEmits<{ close: [picked?: ShootProduct[]] }>()

const {
  search,
  products,
  picked,
  isPicked,
  setPicked,
  loading,
  failed,
  hasMore,
  loadingMore,
  loadMore,
} = useProductPicker(selected)
</script>

<template>
  <!-- Figma: 1075px content, 24px padding and radius. -->
  <VModal
    title="Products"
    description="Products assigned to you. Tick the ones to capture on this shoot."
    class="md:max-w-[1123px]"
  >
    <div class="flex flex-col gap-4 md:gap-5">
      <VSearch v-model="search" placeholder="Search products" aria-label="Search products" />

      <p v-if="loading" role="status" class="py-10 text-center text-p2 font-medium text-secondary">
        Loading…
      </p>
      <p
        v-else-if="failed"
        role="status"
        class="py-10 text-center text-p2 font-medium text-secondary"
      >
        Couldn’t load the products. Please try again.
      </p>
      <p
        v-else-if="!products.length"
        role="status"
        class="py-10 text-center text-p2 font-medium text-secondary"
      >
        {{ search ? 'No products match your search.' : 'No products are assigned to you yet.' }}
      </p>

      <template v-else>
        <ul
          class="grid grid-cols-2 gap-x-3 gap-y-4 md:grid-cols-4 md:gap-x-5 md:gap-y-6 lg:grid-cols-5"
        >
          <li v-for="product in products" :key="product.id">
            <!-- The whole card is the checkbox's label: a click anywhere ticks it. -->
            <label class="flex cursor-pointer flex-col gap-3">
              <MediaPreview :src="product.photoUrl" class="aspect-[4/5] rounded-2xl">
                <VCheckbox
                  :model-value="isPicked(product.id)"
                  class="absolute top-2.5 right-2.5"
                  @update:model-value="setPicked(product, $event === true)"
                />
              </MediaPreview>
              <span class="flex min-w-0 flex-col gap-1.5">
                <span class="truncate text-p1 font-semibold text-primary">{{ product.name }}</span>
                <span v-if="product.collection" class="truncate text-p3 font-medium text-secondary">
                  {{ product.collection }}
                </span>
              </span>
            </label>
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
