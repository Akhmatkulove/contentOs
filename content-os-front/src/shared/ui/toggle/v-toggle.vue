<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { cn } from '@/shared/lib'

// Figma "CMS / Desktop / Toggle" and "CMS / Mobile / Toggle", on Reka Switch:
// role="switch", Space toggles, a <label for> clicks it. The mobile set has no
// Hover state; hover: only fires with a mouse. Other attributes (id,
// aria-label, name) go to the switch button.
const { disabled = false, class: className } = defineProps<{
  disabled?: boolean
  class?: HTMLAttributes['class']
}>()

const checked = defineModel<boolean>({ default: false })

const base = [
  'inline-flex h-6 w-[42px] shrink-0 items-center rounded-full p-[3px] transition-colors outline-none',
  'focus-visible:ring-2 focus-visible:ring-violet-300 disabled:pointer-events-none',
  'data-[state=checked]:bg-action-accent hover:data-[state=checked]:bg-inverse disabled:data-[state=checked]:bg-violet-200',
  'data-[state=unchecked]:bg-neutral-400 hover:data-[state=unchecked]:bg-neutral-500 disabled:data-[state=unchecked]:bg-neutral-300',
].join(' ')

const classes = computed(() => (className ? cn(base, className) : base))
</script>

<template>
  <SwitchRoot v-model="checked" :disabled="disabled" :class="classes">
    <SwitchThumb
      class="block size-[18px] rounded-full bg-white transition-transform data-[state=checked]:translate-x-4.5 motion-reduce:transition-none"
    />
  </SwitchRoot>
</template>
