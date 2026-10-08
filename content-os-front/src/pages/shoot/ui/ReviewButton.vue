<script setup lang="ts">
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'

// Figma "Button / Review" (Soft, 34). It will open the review of the upload.
// TODO(ui): make it a link to the review screen once that is designed.
const { name } = defineProps<{ name: string }>()
</script>

<template>
  <VButton variant="soft" size="34" :aria-label="`Review ${name}`">
    <VIcon name="file-view" />
    Review
  </VButton>
</template>
