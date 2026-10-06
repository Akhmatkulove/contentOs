<script setup lang="ts">
import { DropdownMenuItem } from 'reka-ui'

// Figma "Option / …" of the dropdown: a 40px row. `select` fires on click,
// Enter or Space, then the menu closes.
const { disabled = false } = defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{ select: [] }>()
</script>

<template>
  <DropdownMenuItem
    :disabled="disabled"
    class="flex h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-p2 font-medium text-primary outline-none select-none data-disabled:cursor-not-allowed data-disabled:text-tertiary data-highlighted:bg-subtle"
    @select="emit('select')"
  >
    <slot />
  </DropdownMenuItem>
</template>
