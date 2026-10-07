<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'
import { cn } from '@/shared/lib'
import { VIcon } from '@/shared/ui/icon'

// Figma "CMS / Shared / Checkbox" on Reka Checkbox: role="checkbox", Space
// toggles, a <label> around it or <label for> clicks it. 18 for lists and
// cards, 22 for content thumbnails. "indeterminate" is for a select-all box
// when only some rows are picked (not in Figma: a bar instead of the tick).
// Other attributes (id, aria-label, name) go to the checkbox button.
const {
  size = 18,
  disabled = false,
  class: className,
} = defineProps<{
  size?: 18 | 22
  disabled?: boolean
  class?: HTMLAttributes['class']
}>()

const checked = defineModel<boolean | 'indeterminate'>({ default: false })

const base = [
  'inline-flex shrink-0 items-center justify-center rounded-[4px] border transition-colors outline-none',
  'focus-visible:ring-2 focus-visible:ring-violet-300 disabled:pointer-events-none disabled:opacity-50',
  'data-[state=unchecked]:border-default data-[state=unchecked]:bg-card hover:data-[state=unchecked]:border-strong',
  'data-[state=checked]:border-transparent data-[state=checked]:bg-inverse data-[state=checked]:text-inverse',
  'data-[state=indeterminate]:border-transparent data-[state=indeterminate]:bg-inverse data-[state=indeterminate]:text-inverse',
].join(' ')

const classes = computed(() => cn(base, size === 22 ? 'size-5.5' : 'size-4.5', className))
</script>

<template>
  <CheckboxRoot v-model="checked" :disabled="disabled" :class="classes">
    <CheckboxIndicator class="flex items-center justify-center">
      <span
        v-if="checked === 'indeterminate'"
        aria-hidden="true"
        class="h-0.5 w-2 rounded-full bg-current"
      />
      <VIcon v-else name="tick-01" :size="size === 22 ? 16 : 13" />
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
