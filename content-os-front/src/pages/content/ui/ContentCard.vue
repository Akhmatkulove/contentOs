<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { durationLabel } from '@/entities/deliverable'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VStatus } from '@/shared/ui/status'
import type { ContentItemResponse } from '../api/content'
import { contentStatusChip } from '../model/content-item'

const { item } = defineProps<{ item: ContentItemResponse }>()
const emit = defineEmits<{ open: [] }>()

const video = computed(() => item.file.kind === 'video')
const status = computed(() => contentStatusChip[item.status])
// The video's length, once the browser has read its metadata.
const duration = shallowRef<number | null>(null)
</script>

<!--
  Figma "Card / …" of "SCREEN:c_list Content". On mobile the card sits on a white
  surface with a border, like the reference cards; on desktop it has none.
  TODO(ui): the selection checkbox and the "…" menu — not in this iteration.
-->
<template>
  <article
    class="flex min-w-0 flex-col gap-2 overflow-hidden rounded-xl border border-default bg-card p-2.5 md:gap-3 md:rounded-none md:border-0 md:bg-transparent md:p-0"
  >
    <VButton
      variant="ghost"
      :aria-label="`Open ${item.name}`"
      class="group relative block aspect-[9/16] h-auto w-full cursor-zoom-in overflow-hidden rounded-lg bg-muted p-0 md:rounded-2xl"
      @click="emit('open')"
    >
      <img
        v-if="!video"
        :src="item.file.url"
        alt=""
        loading="lazy"
        decoding="async"
        class="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
      />
      <!-- Muted, no controls: a still of the first frame. It plays in the viewer. -->
      <video
        v-else
        muted
        playsinline
        preload="metadata"
        :src="`${item.file.url}#t=0.1`"
        class="pointer-events-none size-full object-cover"
        @loadedmetadata="duration = ($event.target as HTMLVideoElement).duration"
      />
      <span
        v-if="video"
        class="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-md bg-overlay-media px-2 py-1 text-p4 font-medium text-inverse"
      >
        <VIcon name="play" :size="10" />
        <template v-if="duration !== null && Number.isFinite(duration)">
          {{ durationLabel(duration) }}
        </template>
        <span v-else>Video</span>
      </span>
    </VButton>

    <div class="flex min-w-0 flex-col gap-2 md:gap-1.5">
      <h3 class="truncate text-p2 font-semibold text-primary md:text-p1">{{ item.name }}</h3>
      <p class="truncate text-p3 font-medium text-secondary">{{ item.product.name }}</p>
    </div>

    <!-- The shoot only for its art director and their creators; a brand sees the status alone. -->
    <div class="flex min-w-0 items-center justify-between gap-2">
      <p
        v-if="item.shoot"
        class="flex min-w-0 items-center gap-1.5 text-p3 font-medium text-secondary"
      >
        <VIcon name="package" :size="14" class="shrink-0" />
        <span class="truncate">{{ item.shoot.name }}</span>
      </p>
      <VStatus :tone="status.tone" class="ml-auto">{{ status.label }}</VStatus>
    </div>
  </article>
</template>
