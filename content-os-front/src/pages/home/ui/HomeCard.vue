<script setup lang="ts">
import { useId } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { VIcon } from '@/shared/ui/icon'

// Figma "Card / …" of the home screen: a title, View all, the content.
// `bare`: on mobile the tiles are cards themselves (Recent shoots, Products), so
// the section has no surface of its own there.
const {
  title,
  to,
  bare = false,
} = defineProps<{
  title: string
  to?: RouteLocationRaw
  bare?: boolean
}>()

const headingId = useId()
</script>

<template>
  <section
    :aria-labelledby="headingId"
    :class="[
      'flex min-w-0 flex-col gap-3 md:gap-4 md:rounded-2xl md:bg-card md:p-5',
      bare ? '' : 'rounded-2xl bg-card p-4 shadow-[0_8px_16px_rgb(29_42_60/0.05)] md:shadow-none',
    ]"
  >
    <div class="flex items-center justify-between gap-3">
      <h2 :id="headingId" class="text-h6 text-primary">{{ title }}</h2>
      <RouterLink
        v-if="to"
        :to="to"
        class="flex shrink-0 items-center gap-1.5 text-p2 font-medium text-secondary transition-colors hover:text-brand"
      >
        View all<span class="sr-only"> {{ title.toLowerCase() }}</span>
        <VIcon name="arrow-right-02-sharp" :size="16" />
      </RouterLink>
    </div>
    <slot />
  </section>
</template>
