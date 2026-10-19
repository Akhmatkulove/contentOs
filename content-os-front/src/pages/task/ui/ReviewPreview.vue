<script setup lang="ts">
import { useTemplateRef } from 'vue'
import type { ContentFile } from '@/entities/deliverable'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'

// Figma "Review preview": the picked file at full size. Videos play here with
// the browser's controls; contain, not cover, so the whole frame is checked.
// A click on an image or the corner button opens it fullscreen.
// TODO(ui): the custom player bar from Figma ("Player controls").
const { file } = defineProps<{ file: ContentFile }>()
const emit = defineEmits<{ open: [] }>()

// The viewer plays the video itself: the preview stops, so two don't play at once.
const video = useTemplateRef('video')
function open() {
  video.value?.pause()
  emit('open')
}
</script>

<template>
  <div
    class="relative flex h-[360px] items-center justify-center overflow-hidden rounded-xl bg-muted md:h-[440px]"
  >
    <!-- :key — a new file starts from its beginning, not where the last one stopped. -->
    <video
      v-if="file.video"
      ref="video"
      :key="file.id"
      :src="file.url"
      :aria-label="file.name"
      controls
      playsinline
      preload="metadata"
      class="size-full object-contain"
    />
    <img
      v-else
      :key="file.id"
      :src="file.url"
      :alt="file.name"
      class="size-full cursor-zoom-in object-contain"
      @click="open"
    />
    <!-- Not in Figma: the way to the fullscreen viewer. -->
    <VButton
      variant="ghost"
      size="icon-36"
      :aria-label="`Open ${file.name} fullscreen`"
      class="absolute top-3 right-3 bg-overlay-media text-inverse backdrop-blur-sm hover:bg-overlay-scrim active:bg-overlay-scrim"
      @click="open"
    >
      <VIcon name="arrow-expand-diagonal-01-sharp" :size="16" />
    </VButton>
  </div>
</template>
