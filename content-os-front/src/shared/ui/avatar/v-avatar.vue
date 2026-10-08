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
  size?: 24 | 28 | 36 | 40 | 44 | 80
  class?: HTMLAttributes['class']
}>()

const initial = computed(() => (name || 'U').charAt(0).toUpperCase())
// 44 (member cards) and up show a larger initial, as in Figma; 80 is the profile page.
const sizeClasses = {
  24: 'size-6',
  28: 'size-7',
  36: 'size-9',
  40: 'size-10',
  44: 'size-11 text-h6',
  80: 'size-20 text-h3',
} as const
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
