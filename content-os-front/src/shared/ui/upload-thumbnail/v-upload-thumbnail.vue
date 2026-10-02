<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'

// Figma "CMS / Shared / Upload thumbnail": a 9:16 preview with a remove
// button in the corner. The button's hit area is 24px; the visible dot is 13px.
const {
  src,
  alt = '',
  class: className,
} = defineProps<{
  src: string
  alt?: string
  class?: HTMLAttributes['class']
}>()

defineEmits<{ remove: [] }>()
</script>

<template>
  <div
    :class="
      cn('relative aspect-[9/16] w-20 shrink-0 overflow-hidden rounded-[10px] bg-muted', className)
    "
  >
    <img :src="src" :alt="alt" class="size-full object-cover" />
    <VButton
      variant="ghost"
      size="icon-24"
      :aria-label="alt ? `Remove ${alt}` : 'Remove'"
      class="absolute top-0 right-0 items-start justify-end p-1"
      @click="$emit('remove')"
    >
      <span
        class="flex size-[13px] items-center justify-center rounded-full bg-overlay-media text-inverse"
      >
        <VIcon name="multiplication-sign" :size="8" />
      </span>
    </VButton>
  </div>
</template>
