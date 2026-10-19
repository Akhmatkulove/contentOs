<script setup lang="ts">
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'

// Figma "Button / Review" (Soft, 34): opens the deliverable's review (docs/adr/0015).
const { id, name } = defineProps<{ id: string; name: string }>()
</script>

<template>
  <VButton as-child variant="soft" size="34">
    <RouterLink :to="{ name: 'task-review', params: { id } }" :aria-label="`Review ${name}`">
      <VIcon name="file-view" />
      Review
    </RouterLink>
  </VButton>
</template>
