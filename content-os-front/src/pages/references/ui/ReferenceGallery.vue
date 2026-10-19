<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core'
import { computed, reactive, shallowRef, useTemplateRef } from 'vue'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { dealColumns, galleryColumns, type ReferenceFile } from '../model/reference'

const { files, title } = defineProps<{ files: ReferenceFile[]; title: string }>()
const emit = defineEmits<{ open: [index: number] }>()

// Gap between columns and tiles: gap-3 on mobile, gap-5 from md.
const root = useTemplateRef('root')
const width = shallowRef(0)
useResizeObserver(root, ([entry]) => (width.value = entry!.contentRect.width))
const gap = computed(() => (width.value >= 720 ? 20 : 12))
const columns = computed(() =>
  dealColumns(files, galleryColumns(width.value, files.length, gap.value)),
)

// Tiles keep a placeholder until the file has its size, then take its proportions.
const loaded = reactive(new Set<string>())

// TODO(api): thumbnails — the gallery and the viewer's strip load the originals.
// The first screenful loads at once, the rest as it scrolls into view.
const EAGER = 4

function label(index: number, file: ReferenceFile): string {
  const kind = file.kind === 'video' ? 'video' : 'image'
  return `Open ${kind} ${index + 1} of ${files.length}`
}
</script>

<!--
  Not in Figma: the reference's files uncropped, in their own proportions.
  One file takes the whole width (as tall as the screen allows); several are
  dealt into columns row by row, so the order matches the viewer's.
-->
<template>
  <div
    ref="root"
    :aria-label="`${title}: files`"
    role="group"
    :class="['flex items-start', gap === 20 ? 'gap-5' : 'gap-3']"
  >
    <ul
      v-for="(column, c) in columns"
      :key="c"
      :class="['flex min-w-0 flex-1 flex-col', gap === 20 ? 'gap-5' : 'gap-3']"
    >
      <li v-for="{ item, index } in column" :key="item.id">
        <VButton
          variant="ghost"
          :aria-label="label(index, item)"
          :class="[
            'group relative block h-auto w-full cursor-zoom-in overflow-hidden rounded-2xl bg-muted p-0 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
            files.length === 1 && 'mx-auto w-fit max-w-full',
          ]"
          @click="emit('open', index)"
        >
          <div
            v-if="!loaded.has(item.id)"
            aria-hidden="true"
            :class="[
              'animate-pulse bg-muted',
              files.length === 1 ? 'aspect-[4/5] h-[min(78dvh,40rem)]' : 'aspect-[4/5] w-full',
            ]"
          />
          <img
            v-if="item.kind === 'image'"
            alt=""
            decoding="async"
            :loading="index < EAGER ? 'eager' : 'lazy'"
            :fetchpriority="index === 0 ? 'high' : undefined"
            :src="item.url"
            :class="[
              'block transition duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none',
              files.length === 1 ? 'max-h-[78dvh] w-auto max-w-full' : 'h-auto w-full',
              loaded.has(item.id) ? 'opacity-100' : 'absolute inset-0 opacity-0',
            ]"
            @load="loaded.add(item.id)"
            @error="loaded.add(item.id)"
          />
          <!-- Muted, no controls: a still of the first frame. It plays in the viewer. -->
          <video
            v-else
            muted
            playsinline
            preload="metadata"
            :src="`${item.url}#t=0.1`"
            :class="[
              'pointer-events-none block',
              files.length === 1 ? 'max-h-[78dvh] w-auto max-w-full' : 'h-auto w-full',
              loaded.has(item.id) ? 'opacity-100' : 'absolute inset-0 opacity-0',
            ]"
            @loadedmetadata="loaded.add(item.id)"
            @error="loaded.add(item.id)"
          />

          <span
            v-if="item.kind === 'video'"
            aria-hidden="true"
            class="absolute inset-0 flex items-center justify-center bg-overlay-scrim/0 transition-colors group-hover:bg-overlay-scrim"
          >
            <span
              class="flex size-14 items-center justify-center rounded-full bg-overlay-media text-inverse backdrop-blur-sm"
            >
              <VIcon name="play" :size="20" />
            </span>
          </span>
          <!-- A mouse hint: the file opens larger. -->
          <span
            v-else
            aria-hidden="true"
            class="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-overlay-media text-inverse opacity-0 transition-opacity group-hover:opacity-100"
          >
            <VIcon name="arrow-expand-diagonal-01-sharp" :size="14" />
          </span>
          <span
            v-if="files.length > 1"
            aria-hidden="true"
            class="absolute bottom-3 left-3 rounded-md bg-overlay-media px-2 py-1 text-p4 font-medium text-inverse tabular-nums opacity-0 transition-opacity group-hover:opacity-100"
          >
            {{ index + 1 }} / {{ files.length }}
          </span>
        </VButton>
      </li>
    </ul>
  </div>
</template>
