<script setup lang="ts">
import { computed } from 'vue'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import type { ContentMaterial } from '../api/content'
import type { Rail } from '../model/content-details'

const { current, rail, total, title } = defineProps<{
  // The file on the stage.
  current: ContentMaterial
  rail: Rail
  total: number
  title: string
}>()
// The file on the stage, by its place among all files.
const selected = defineModel<number>('selected', { required: true })
const emit = defineEmits<{ open: [index: number] }>()

const video = computed(() => current.file.kind === 'video')
</script>

<!--
  Figma "Stage" of "SCREEN:c_item Content": the file cropped to fill, the
  thumbnail rail under it. The stage and "+N" open the viewer, where every
  file keeps its own proportions; a video shows a play button instead of the
  player bar and plays there.
-->
<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <VButton
      variant="ghost"
      :aria-label="`Open ${title}, file ${selected + 1} of ${total}`"
      class="group relative block aspect-[4/5] h-auto w-full overflow-hidden rounded-2xl bg-neutral-900 p-0 md:aspect-[9/16]"
      :class="video ? 'cursor-pointer' : 'cursor-zoom-in'"
      @click="emit('open', selected)"
    >
      <!-- Keyed: the new file fades in instead of swapping under the old one. -->
      <Transition
        enter-active-class="transition-opacity duration-300 motion-reduce:transition-none"
        enter-from-class="opacity-0"
      >
        <img
          v-if="!video"
          :key="current.id"
          :src="current.file.url"
          alt=""
          decoding="async"
          class="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02] motion-reduce:transition-none"
        />
        <!-- Muted, no controls: a still of the first frame. It plays in the viewer. -->
        <video
          v-else
          :key="current.id"
          muted
          playsinline
          preload="metadata"
          :src="`${current.file.url}#t=0.1`"
          class="pointer-events-none absolute inset-0 size-full object-cover"
        />
      </Transition>

      <span v-if="video" class="absolute inset-0 flex items-center justify-center">
        <span
          aria-hidden="true"
          class="absolute inset-0 bg-overlay-scrim opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
        <span
          class="relative flex size-16 items-center justify-center rounded-full bg-overlay-media text-inverse backdrop-blur-md transition-transform duration-300 ease-out group-hover:scale-110 group-active:scale-95 motion-reduce:transition-none"
        >
          <VIcon name="play" :size="22" class="translate-x-0.5" />
        </span>
      </span>
      <span
        v-else
        aria-hidden="true"
        class="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-overlay-media text-inverse opacity-0 backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <VIcon name="arrow-expand-diagonal-01-sharp" :size="14" />
      </span>

      <!-- Where you are among the files; the rail shows which. -->
      <span
        v-if="total > 1"
        aria-hidden="true"
        class="absolute bottom-3 left-3 rounded-full bg-overlay-media px-2.5 py-1 text-p4 font-medium text-inverse tabular-nums backdrop-blur-md"
      >
        {{ selected + 1 }} / {{ total }}
      </span>
    </VButton>

    <!-- Five slots across, like Figma; one file needs no rail. -->
    <ul v-if="total > 1" aria-label="Files" class="grid grid-cols-5 gap-2">
      <li v-for="(material, index) in rail.shown" :key="material.id">
        <VButton
          variant="ghost"
          :aria-label="`Show file ${index + 1} of ${total}`"
          :aria-current="index === selected || undefined"
          :class="[
            'relative block aspect-[9/16] h-auto w-full overflow-hidden rounded-[10px] bg-muted p-0 transition-opacity duration-200',
            index !== selected && 'opacity-80 hover:opacity-100 active:opacity-100',
          ]"
          @click="selected = index"
        >
          <img
            v-if="material.file.kind === 'image'"
            :src="material.file.url"
            alt=""
            loading="lazy"
            decoding="async"
            class="absolute inset-0 size-full object-cover"
          />
          <template v-else>
            <video
              muted
              playsinline
              preload="metadata"
              :src="`${material.file.url}#t=0.1`"
              class="pointer-events-none absolute inset-0 size-full object-cover"
            />
            <span
              class="absolute bottom-1 left-1 flex items-center justify-center rounded-md bg-overlay-media p-1 text-inverse"
            >
              <VIcon name="play" :size="8" />
            </span>
          </template>
          <!-- Over the picture: an inset ring on the button would be painted under it. -->
          <span
            v-if="index === selected"
            aria-hidden="true"
            class="absolute inset-0 rounded-[10px] ring-2 ring-violet-400 ring-inset"
          />
        </VButton>
      </li>
      <li v-if="rail.more">
        <VButton
          variant="surface"
          :aria-label="`Show ${rail.more} more files`"
          :aria-current="selected >= rail.shown.length || undefined"
          :class="[
            'aspect-[9/16] h-auto w-full rounded-[10px] text-p2 font-semibold transition-colors hover:text-primary active:bg-subtle',
            selected >= rail.shown.length
              ? 'text-link ring-2 ring-violet-400 ring-inset'
              : 'text-secondary',
          ]"
          @click="emit('open', Math.max(selected, rail.shown.length))"
        >
          +{{ rail.more }}
        </VButton>
      </li>
    </ul>
  </div>
</template>
