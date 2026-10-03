<script setup lang="ts" generic="T extends string">
import { computed, type HTMLAttributes } from 'vue'
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { cn } from '@/shared/lib'
import { VIcon } from '@/shared/ui/icon'
import type { SegmentedOption } from './segmented-option'

// Figma "CMS / Desktop / Segment" and "CMS / Mobile / Segment" in their light
// track. A radio group on Reka: one option is always picked (a second click
// doesn't clear it), arrows move and pick, Tab enters on the picked one.
// Clicked = :active; hover: only fires with a mouse (the mobile set has none).
// Give it an aria-label: it goes to the group.
const {
  options,
  disabled = false,
  class: className,
} = defineProps<{
  options: readonly SegmentedOption<T>[]
  disabled?: boolean
  class?: HTMLAttributes['class']
}>()

const model = defineModel<T>({ required: true })

// The track is muted on mobile and subtle on desktop, as in the two sets.
const trackBase = 'flex h-11 rounded-2xl bg-muted p-1 md:bg-subtle gap-2'
const trackClass = computed(() => (className ? cn(trackBase, className) : trackBase))

const itemClass = [
  'flex h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-transparent px-3 text-table font-semibold whitespace-nowrap transition-colors outline-none',
  'focus-visible:ring-2 focus-visible:ring-violet-300 disabled:pointer-events-none',
  'text-secondary data-[state=unchecked]:hover:bg-status-accent',
  'data-[state=checked]:border-default data-[state=checked]:bg-card data-[state=checked]:text-brand',
  'active:border-violet-400 active:bg-status-accent data-[state=checked]:active:border-violet-400 data-[state=checked]:active:bg-status-accent',
  'disabled:text-tertiary disabled:data-[state=checked]:bg-subtle disabled:data-[state=checked]:text-tertiary',
].join(' ')
</script>

<template>
  <RadioGroupRoot
    :model-value="model"
    :disabled="disabled"
    orientation="horizontal"
    :class="trackClass"
    @update:model-value="(value) => (model = value as T)"
  >
    <RadioGroupItem
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      :disabled="option.disabled"
      :class="itemClass"
    >
      <VIcon v-if="option.icon" :name="option.icon" :size="16" class="shrink-0" />
      <span class="truncate">{{ option.label }}</span>
    </RadioGroupItem>
  </RadioGroupRoot>
</template>
