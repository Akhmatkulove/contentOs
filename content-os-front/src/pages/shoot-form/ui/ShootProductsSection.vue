<script setup lang="ts">
import { computed, useId } from 'vue'
import { VButton } from '@/shared/ui/button'
import { VSearch } from '@/shared/ui/search'
import { VSectionCard } from '@/shared/ui/section-card'
import { selectionLabel, toggleSelection, type ShootProduct } from '../model/shoot-draft'
import SelectableProductCard from './SelectableProductCard.vue'

// Figma "Card / Select products": search, how many are picked, and the
// products as cards with a checkbox. Two per row on mobile, four on desktop.
const { products, error } = defineProps<{
  products: ShootProduct[]
  // "Select at least one product."; empty while fine.
  error?: string
}>()

const search = defineModel<string>('search', { required: true })
const selected = defineModel<string[]>('selected', { required: true })

// "Browse all products": the form opens the picker.
const emit = defineEmits<{ browse: [] }>()

function isSelected(id: string) {
  return selected.value.includes(id)
}

function setSelected(id: string, value: boolean | 'indeterminate') {
  selected.value = toggleSelection(selected.value, id, value === true)
}

const count = computed(() => selectionLabel(selected.value.length, products.length))
const errorId = useId()
</script>

<template>
  <VSectionCard
    title="Select products"
    description="Search for products and add them to this shoot."
    required
  >
    <template #action>
      <!-- Carries the error: a failed submit focuses it and screen readers read why. -->
      <VButton
        variant="secondary"
        class="h-11 w-full md:h-10 md:w-auto"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="error ? errorId : undefined"
        @click="emit('browse')"
      >
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

    <ul
      v-if="products.length"
      class="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4"
    >
      <li v-for="product in products" :key="product.id">
        <SelectableProductCard
          :product="product"
          :selected="isSelected(product.id)"
          @update:selected="setSelected(product.id, $event)"
        />
      </li>
    </ul>
    <p
      v-else
      :class="[
        'flex h-[117px] items-center justify-center rounded-[20px] bg-subtle p-8 text-center text-p1 font-medium text-secondary',
        error && 'border border-red-400',
      ]"
    >
      The products you add will be displayed here
    </p>
    <p v-if="error" :id="errorId" class="text-p3 font-medium text-red-400">{{ error }}</p>
  </VSectionCard>
</template>
