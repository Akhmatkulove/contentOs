<script setup lang="ts">
import { VCheckbox } from '@/shared/ui/checkbox'
import type { ShootProduct } from '../model/shoot-draft'
import MediaPreview from './MediaPreview.vue'

// A product picked for a shoot: Figma "Selected product / …" in "Card / Select
// products", the same card in "Browse all products". The whole card is the
// checkbox's label, so a click anywhere ticks it. The products page has its own
// card: a link to the product.
const { product } = defineProps<{ product: ShootProduct }>()

const selected = defineModel<boolean>('selected', { required: true })
</script>

<template>
  <label class="flex min-w-0 cursor-pointer flex-col gap-2.5">
    <MediaPreview :src="product.photoUrl" class="aspect-[4/5] rounded-lg">
      <VCheckbox
        :model-value="selected"
        :aria-label="`Select ${product.name}`"
        class="absolute top-3 right-3"
        @update:model-value="selected = $event === true"
      />
    </MediaPreview>
    <span class="truncate text-p1 font-semibold text-primary">{{ product.name }}</span>
    <span v-if="product.collection" class="truncate text-p3 font-medium text-secondary">
      {{ product.collection }}
    </span>
  </label>
</template>
