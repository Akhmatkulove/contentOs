<script setup lang="ts">
import type { BrandDeliverable } from '../model/brand-deliverable'

// The date and how soon, as Figma "Due metadata" in the shoot tasks.
const { deliverable } = defineProps<{ deliverable: BrandDeliverable }>()
</script>

<template>
  <div v-if="deliverable.dueDate" class="flex flex-col gap-1 text-p3 font-medium whitespace-nowrap">
    <span class="text-primary">{{ deliverable.dueDate }}</span>
    <span
      v-if="deliverable.due"
      :class="deliverable.due.urgent ? 'text-red-400' : 'text-secondary'"
    >
      {{ deliverable.due.label }}
    </span>
  </div>
  <span v-else class="text-p3 font-medium text-secondary">—</span>
</template>
