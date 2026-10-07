<script setup lang="ts">
import { computed } from 'vue'
import { VButton } from '@/shared/ui/button'
import { VCheckbox } from '@/shared/ui/checkbox'
import { VSearch } from '@/shared/ui/search'
import { VSectionCard } from '@/shared/ui/section-card'
import { selectionLabel, toggleSelection, type ShootProduct } from '../model/shoot-draft'
import MediaPreview from './MediaPreview.vue'

// Figma "Card / Select products": search, how many are picked, and the
// products as cards with a checkbox. Two per row on mobile, four on desktop.
const { products } = defineProps<{ products: ShootProduct[] }>()

const search = defineModel<string>('search', { required: true })
const selected = defineModel<string[]>('selected', { required: true })

function isSelected(id: string) {
  return selected.value.includes(id)
}

function setSelected(id: string, value: boolean | 'indeterminate') {
  selected.value = toggleSelection(selected.value, id, value === true)
}

const count = computed(() => selectionLabel(selected.value.length, products.length))
</script>

<template>
  <VSectionCard
    title="Select products"
    description="Search for products and add them to this shoot."
  >
    <template #action>
      <!-- TODO(ui): product picker — "Browse all products" is not in Figma yet. -->
      <VButton variant="secondary" class="h-11 w-full md:h-10 md:w-auto">
        Browse all products
      </VButton>
    </template>

    <div class="flex items-center justify-between gap-4">
      <!-- TODO(ui): "Search or select products…" is a combobox in Figma (chevron, dropdown). -->
      <VSearch
        v-model="search"
        placeholder="Search or select products…"
        aria-label="Search products"
        class="min-w-0 flex-1 lg:max-w-[890px]"
      />
      <p aria-live="polite" class="hidden shrink-0 text-p3 font-medium text-secondary md:block">
        {{ count }}
      </p>
    </div>

    <ul class="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      <li v-for="product in products" :key="product.id">
        <!-- The whole card is the checkbox's label: a click anywhere picks it. -->
        <label class="flex cursor-pointer flex-col gap-2.5">
          <MediaPreview :src="product.photoUrl" class="aspect-[4/5] rounded-lg">
            <VCheckbox
              :model-value="isSelected(product.id)"
              class="absolute top-3 left-3"
              @update:model-value="setSelected(product.id, $event)"
            />
          </MediaPreview>
          <span class="truncate text-p1 font-semibold text-primary">{{ product.name }}</span>
          <span class="truncate text-p3 font-medium text-secondary">{{ product.collection }}</span>
        </label>
      </li>
    </ul>
  </VSectionCard>
</template>
