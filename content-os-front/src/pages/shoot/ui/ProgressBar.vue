<script setup lang="ts">
// Figma "CMS / Shared / Progress bar": a 6px track with the approved share filled.
const { percent, label = 'Deliverables approved' } = defineProps<{
  percent: number
  label?: string
}>()
</script>

<template>
  <div
    role="progressbar"
    :aria-valuenow="percent"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-label="label"
    class="h-1.5 overflow-hidden rounded-full bg-neutral-300"
  >
    <div class="h-full rounded-full bg-action-accent" :style="{ width: `${percent}%` }" />
  </div>
</template>
