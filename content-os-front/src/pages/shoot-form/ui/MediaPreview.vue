<script setup lang="ts">
import { VIcon } from '@/shared/ui/icon'

// A photo or video preview (Figma "Product photo / 4:5", "Video preview",
// "CMS / Shared / Thumbnail"). Size, ratio and radius come from the caller;
// without a picture it shows an image icon on grey (or plain grey with
// `placeholderIcon: false`, when an overlay already sits in the middle).
// Overlays go in the slot.
const {
  src,
  iconSize = 24,
  placeholderIcon = true,
} = defineProps<{
  src: string | null
  iconSize?: number
  placeholderIcon?: boolean
}>()
</script>

<template>
  <div class="relative shrink-0 overflow-hidden bg-muted">
    <img v-if="src" :src="src" alt="" loading="lazy" class="size-full object-cover" />
    <span
      v-else-if="placeholderIcon"
      aria-hidden="true"
      class="flex size-full items-center justify-center text-tertiary"
    >
      <VIcon name="image-01" :size="iconSize" />
    </span>
    <slot />
  </div>
</template>
