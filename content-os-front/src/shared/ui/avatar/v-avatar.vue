<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib'

// Figma "CMS / Shared / Avatar": the photo, or the first letter of the name.
// Figma has sizes 20–44; the size is the width and height in px.
const {
  name,
  src,
  size = 28,
  class: className,
} = defineProps<{
  name: string | null
  src: string | null
  size?: 24 | 28 | 36
  class?: HTMLAttributes['class']
}>()

const initial = computed(() => (name || 'U').charAt(0).toUpperCase())
const sizeClasses = { 24: 'size-6', 28: 'size-7', 36: 'size-9' } as const
const sizeClass = computed(() => sizeClasses[size])
</script>

<template>
  <img
    v-if="src"
    :src="src"
    alt=""
    :class="cn('shrink-0 rounded-full object-cover', sizeClass, className)"
  />
  <span
    v-else
    aria-hidden="true"
    :class="
      cn(
        'flex shrink-0 items-center justify-center rounded-full bg-mint-100 text-p3 font-medium text-mint-400',
        sizeClass,
        className,
      )
    "
  >
    {{ initial }}
  </span>
</template>
