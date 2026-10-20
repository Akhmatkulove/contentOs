<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { DropdownMenuItem } from 'reka-ui'
import { cn } from '@/shared/lib'

// Figma "Option / …" of the dropdown: a 40px row. `select` fires on click,
// Enter or Space, then the menu closes.
const {
  disabled = false,
  asChild = false,
  class: className,
} = defineProps<{
  disabled?: boolean
  // Render the single child (a link that opens elsewhere) with the item's look.
  asChild?: boolean
  class?: HTMLAttributes['class']
}>()
const emit = defineEmits<{ select: [] }>()
</script>

<template>
  <DropdownMenuItem
    :disabled="disabled"
    :as-child="asChild"
    :class="
      cn(
        'flex h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-p2 font-medium text-primary outline-none select-none data-disabled:cursor-not-allowed data-disabled:text-tertiary data-highlighted:bg-subtle',
        className,
      )
    "
    @select="emit('select')"
  >
    <slot />
  </DropdownMenuItem>
</template>
