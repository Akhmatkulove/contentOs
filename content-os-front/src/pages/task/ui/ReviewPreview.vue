<script setup lang="ts">
import type { ContentFile } from '@/entities/deliverable'

// Figma "Review preview": the picked file at full size. Videos play here with
// the browser's controls; contain, not cover, so the whole frame is checked.
// TODO(ui): the custom player bar from Figma ("Player controls").
const { file } = defineProps<{ file: ContentFile }>()
</script>

<template>
  <div
    class="flex h-[360px] items-center justify-center overflow-hidden rounded-xl bg-muted md:h-[440px]"
  >
    <!-- :key — a new file starts from its beginning, not where the last one stopped. -->
    <video
      v-if="file.video"
      :key="file.id"
      :src="file.url"
      :aria-label="file.name"
      controls
      playsinline
      preload="metadata"
      class="size-full object-contain"
    />
    <img v-else :key="file.id" :src="file.url" :alt="file.name" class="size-full object-contain" />
  </div>
</template>
