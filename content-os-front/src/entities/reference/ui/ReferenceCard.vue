<script setup lang="ts">
import { computed } from 'vue'
import { VButton } from '@/shared/ui/button'
import { type IconName, VIcon } from '@/shared/ui/icon'
import { formatDuration, referenceKindLabels, type Reference } from '../model/reference'

const { reference } = defineProps<{ reference: Reference }>()

// The star asks the screen to flip the favourite; the screen owns the request.
const emit = defineEmits<{ toggleFavorite: [] }>()

const duration = computed(() =>
  reference.durationSec === null ? null : formatDuration(reference.durationSec),
)

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

// One badge per kind of file: "🎥 1" and "🖼 2" for a mixed moodboard.
// A video link has no files, so it gets the video icon alone.
const badges = computed(() => {
  const { videoCount, imageCount, kind } = reference
  const list: { icon: IconName; count: number | null; label: string }[] = []
  if (videoCount)
    list.push({ icon: 'video-01', count: videoCount, label: plural(videoCount, 'video') })
  else if (!imageCount && kind === 'video')
    list.push({ icon: 'video-01', count: null, label: 'Video' })
  if (imageCount)
    list.push({ icon: 'image-02', count: imageCount, label: plural(imageCount, 'image') })
  return list
})
</script>

<!--
  Figma "CMS / Mobile / Reference card" and "CMS / Desktop / Reference card".
  On mobile the card sits on a white surface with a border; on desktop it has
  no surface and the 9:16 preview gets the larger radius.
-->
<template>
  <article
    class="flex min-w-0 flex-col gap-2 overflow-hidden rounded-xl border border-default bg-card p-2.5 md:gap-3 md:rounded-none md:border-0 md:bg-transparent md:p-0"
  >
    <div class="relative aspect-[9/16] overflow-hidden rounded-lg bg-muted md:rounded-2xl">
      <img
        v-if="reference.previewUrl"
        :src="reference.previewUrl"
        alt=""
        loading="lazy"
        class="size-full object-cover"
      />
      <div class="absolute inset-x-2.5 top-2.5 flex items-center justify-between">
        <span
          v-if="duration"
          class="flex items-center gap-1 rounded-md bg-overlay-media px-2 py-1 text-p4 font-medium text-inverse"
        >
          <VIcon name="play" :size="11" />
          {{ duration }}
        </span>
        <!-- Figma "Reference / …" › Type: how many videos and images the reference holds. -->
        <div v-else-if="badges.length" class="flex items-center gap-1">
          <span
            v-for="badge in badges"
            :key="badge.icon"
            :aria-label="badge.label"
            class="flex items-center gap-1 rounded-md bg-overlay-media px-2 py-1 text-p4 font-medium text-inverse"
          >
            <VIcon :name="badge.icon" :size="12" />
            {{ badge.count }}
          </span>
        </div>
        <!-- Figma "CMS / Desktop / Favourite button" by default. A screen can put its
             own 26px action here instead (product create: remove). -->
        <div class="ml-auto">
          <slot name="action">
            <!-- Selected: the star fills (--icon-fill in the sprite's star). -->
            <VButton
              variant="surface"
              size="icon-24"
              :aria-label="`Favorite ${reference.title}`"
              :aria-pressed="reference.favorite"
              :class="[
                'size-6.5 hover:bg-status-accent active:bg-violet-200',
                reference.favorite ? 'text-link [--icon-fill:currentColor]' : 'text-neutral-800',
              ]"
              @click="emit('toggleFavorite')"
            >
              <VIcon name="star" :size="13" />
            </VButton>
          </slot>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-2 md:gap-1.5">
      <h3 class="truncate text-p2 font-semibold text-primary md:text-p1">
        {{ reference.title }}
      </h3>
      <p class="truncate text-p3 font-medium text-secondary">
        {{ referenceKindLabels[reference.kind] }} • {{ reference.author }}
      </p>
    </div>

    <!-- Tags wrap on mobile; on desktop they stay on one line and clip. -->
    <ul v-if="reference.tags.length" class="flex flex-wrap gap-1.5 overflow-hidden md:flex-nowrap">
      <li
        v-for="tag in reference.tags"
        :key="tag"
        class="shrink-0 rounded-full bg-neutral-200 px-2.5 py-1 text-p4 font-medium whitespace-nowrap text-neutral-700 md:bg-neutral-300 md:text-secondary"
      >
        {{ tag }}
      </li>
    </ul>
  </article>
</template>
