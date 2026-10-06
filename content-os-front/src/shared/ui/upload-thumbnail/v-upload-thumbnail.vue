<script setup lang="ts">
import { ref, type HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'

// Figma "CMS / Shared / Upload thumbnail": a 9:16 preview with a remove
// button in the corner. The button's hit area is 24px; the visible dot is 13px.
const {
  src,
  alt = '',
  video = false,
  class: className,
} = defineProps<{
  src: string
  alt?: string
  // The file is a video: its first frame is the preview.
  video?: boolean
  class?: HTMLAttributes['class']
}>()

// `load` fires once the preview is ready to show, or has failed to load:
// either way there is nothing more to wait for.
const emit = defineEmits<{ remove: []; load: [] }>()

// Until then the card fills up from the bottom. The browser gives no progress
// for a local preview, so the fill eases towards 90% and jumps to the top on load.
const loaded = ref(false)

function onLoad() {
  loaded.value = true
  emit('load')
}
</script>

<template>
  <div
    :class="
      cn('relative aspect-[9/16] w-20 shrink-0 overflow-hidden rounded-[10px] bg-muted', className)
    "
  >
    <!-- #t=0.1 makes iOS Safari paint a frame without playing. -->
    <video
      v-if="video"
      :src="`${src}#t=0.1`"
      :aria-label="alt || undefined"
      muted
      playsinline
      preload="metadata"
      class="size-full object-cover"
      @loadeddata="onLoad"
      @error="onLoad"
    />
    <img
      v-else
      :src="src"
      :alt="alt"
      class="size-full object-cover"
      @load="onLoad"
      @error="onLoad"
    />
    <Transition
      leave-active-class="transition-opacity delay-150 duration-200"
      leave-to-class="opacity-0"
    >
      <div v-if="!loaded" data-loading class="absolute inset-0 bg-muted">
        <div
          :class="
            cn(
              'absolute inset-x-0 bottom-0 bg-status-accent',
              loaded ? 'h-full transition-[height] duration-150' : 'fill-up motion-reduce:h-full',
            )
          "
        />
      </div>
    </Transition>
    <!-- Tells a video apart from an image at a glance; the remove button has the other corner. -->
    <span
      v-if="video"
      data-video-badge
      class="absolute top-1 left-1 flex items-center justify-center rounded-md bg-overlay-media p-1 text-inverse"
    >
      <VIcon name="video-01" :size="10" />
    </span>
    <VButton
      variant="ghost"
      size="icon-24"
      :aria-label="alt ? `Remove ${alt}` : 'Remove'"
      class="absolute top-0 right-0 items-start justify-end p-1"
      @click="$emit('remove')"
    >
      <span
        class="flex size-[13px] items-center justify-center rounded-full bg-overlay-media text-inverse"
      >
        <VIcon name="multiplication-sign" :size="8" />
      </span>
    </VButton>
  </div>
</template>

<style scoped>
.fill-up {
  animation: fill-up 4s cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
}

@keyframes fill-up {
  from {
    height: 0;
  }
  to {
    height: 90%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fill-up {
    animation: none;
  }
}
</style>
