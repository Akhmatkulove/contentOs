<script setup lang="ts">
import type { BrandDeliverable } from '../model/brand-deliverable'

// The art director's shoots that close the deliverable, as links.
const { deliverable } = defineProps<{ deliverable: BrandDeliverable }>()
</script>

<template>
  <ul v-if="deliverable.shoots.length" class="flex flex-col gap-1">
    <li v-for="shoot in deliverable.shoots" :key="shoot.id">
      <RouterLink
        :to="{ name: 'shoot', params: { id: shoot.id } }"
        class="text-p3 font-medium text-primary transition-colors hover:text-brand"
      >
        {{ shoot.name }}
      </RouterLink>
    </li>
  </ul>
  <span v-else class="text-p3 font-medium text-secondary">—</span>
</template>
