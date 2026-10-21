<script setup lang="ts">
import { VIcon } from '@/shared/ui/icon'

// Figma empty state of a home card ("SCREEN:h_ad Art Director view", empty).
const { title, text } = defineProps<{ title: string; text: string }>()
</script>

<template>
  <div
    class="flex min-h-[225px] flex-col items-center justify-center gap-5 rounded-[20px] bg-card p-8 text-center text-secondary"
  >
    <VIcon name="folder-block" :size="32" class="text-neutral-400" />
    <div class="flex flex-col items-center gap-2.5">
      <p class="text-h6">{{ title }}</p>
      <p class="max-w-[420px] text-p1 font-medium">{{ text }}</p>
    </div>
  </div>
</template>
