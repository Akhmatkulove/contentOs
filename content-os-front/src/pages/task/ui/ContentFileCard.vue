<script setup lang="ts">
import { computed, ref } from 'vue'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { durationLabel } from '@/entities/deliverable'
import type { ContentFile } from '../model/task'

// Figma "Uploaded" item of Ready content: a 170×135 preview with the file's
// name and size. Videos get the play control and their length. While a file
// uploads (`progress` set) it is dimmed with a bar along the bottom; a failed
// one says why and offers Retry when trying again may help.
const { file, removable = false } = defineProps<{ file: ContentFile; removable?: boolean }>()
defineEmits<{ remove: []; retry: [] }>()

// Not in the draft yet: still uploading or failed.
const dimmed = computed(() => file.progress !== undefined || !!file.failed)

// The browser reads the length from the video's metadata.
const duration = ref('')
function onMetadata(event: Event) {
  const seconds = (event.target as HTMLVideoElement).duration
  if (Number.isFinite(seconds)) duration.value = durationLabel(seconds)
}
</script>

<template>
  <figure class="flex min-w-0 flex-col gap-2.5">
    <div class="relative aspect-[170/135] w-full overflow-hidden rounded-[9px] bg-muted">
      <!-- #t=0.1 makes iOS Safari paint a frame without playing. -->
      <video
        v-if="file.video"
        :src="`${file.url}#t=0.1`"
        :aria-label="file.name"
        muted
        playsinline
        preload="metadata"
        :class="['size-full object-cover', dimmed && 'opacity-60']"
        @loadedmetadata="onMetadata"
      />
      <img
        v-else
        :src="file.url"
        :alt="file.name"
        loading="lazy"
        :class="['size-full object-cover', dimmed && 'opacity-60']"
      />

      <template v-if="file.video && file.progress === undefined && !file.failed">
        <!-- Figma "CMS / Shared / Play button". -->
        <a
          :href="file.url"
          target="_blank"
          rel="noopener"
          :aria-label="`Play ${file.name}`"
          class="absolute inset-0 m-auto flex size-8 items-center justify-center rounded-2xl bg-overlay-scrim text-inverse"
        >
          <VIcon name="play" :size="16" />
        </a>
        <!-- Figma "CMS / Shared / Media badge". -->
        <span
          v-if="duration"
          class="absolute right-[7px] bottom-[7px] rounded-md bg-overlay-media px-2 py-1 text-p4 font-medium text-inverse"
        >
          {{ duration }}
        </span>
      </template>

      <VButton
        v-if="removable"
        variant="ghost"
        size="icon-24"
        :aria-label="`Remove ${file.name}`"
        class="absolute top-0 right-0 items-start justify-end p-[7px]"
        @click="$emit('remove')"
      >
        <span
          class="flex size-4 items-center justify-center rounded-full bg-overlay-media shrink-0 text-inverse"
        >
          <VIcon name="multiplication-sign" :size="8" />
        </span>
      </VButton>
    </div>
    <div
      v-if="file.progress !== undefined"
      role="progressbar"
      :aria-valuenow="file.progress"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="`Uploading ${file.name}`"
      class="-mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted"
    >
      <div
        class="h-full rounded-full bg-violet-400 transition-[width] duration-200 motion-reduce:transition-none"
        :style="{ width: `${file.progress}%` }"
      />
    </div>
    <figcaption class="flex min-w-0 flex-col font-medium">
      <span class="truncate text-p2 text-primary">{{ file.name }}</span>
      <span v-if="file.failed" class="flex flex-wrap items-center gap-x-2 text-p3">
        <span role="alert" class="text-red-400">{{ file.failed.message }}</span>
        <VButton
          v-if="file.failed.retryable"
          variant="ghost"
          class="h-auto p-0 text-p3 font-semibold text-link"
          :aria-label="`Retry ${file.name}`"
          @click="$emit('retry')"
        >
          Retry
        </VButton>
      </span>
      <span v-else class="text-p3 text-secondary">
        {{ file.progress === undefined ? file.size : `Uploading ${file.progress}%` }}
      </span>
    </figcaption>
  </figure>
</template>
