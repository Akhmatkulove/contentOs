<script setup lang="ts">
import type { IconName } from '@/shared/ui/icon'
import { VIcon } from '@/shared/ui/icon'

// Figma "CMS / Desktop / KPI card" and its mobile twin: a number, what it
// counts and an icon tile. Mobile puts the tile next to the number, desktop
// to the right of both.
const { value, label, icon, chipClass } = defineProps<{
  // Undefined while loading.
  value: number | undefined
  label: string
  icon: IconName
  // The icon tile's colours.
  chipClass: string
}>()
</script>

<template>
  <div
    class="flex min-w-0 flex-col gap-3 rounded-xl bg-card px-3.5 py-4 shadow-[0_8px_32px_4px_rgb(29_42_60/0.05)] lg:h-24 lg:flex-row-reverse lg:items-center lg:justify-between lg:px-5 lg:shadow-none"
  >
    <div class="flex items-center justify-between lg:contents">
      <p class="text-h4 text-primary lg:hidden">{{ value ?? '–' }}</p>
      <span
        :class="[
          'flex size-7 shrink-0 items-center justify-center rounded-xl lg:size-10',
          chipClass,
        ]"
      >
        <VIcon :name="icon" class="size-4 lg:size-5" />
      </span>
    </div>
    <div class="flex min-w-0 flex-col gap-1.5">
      <p class="hidden text-h3 text-primary lg:block">{{ value ?? '–' }}</p>
      <p class="truncate text-p3 font-medium text-secondary">{{ label }}</p>
    </div>
  </div>
</template>
