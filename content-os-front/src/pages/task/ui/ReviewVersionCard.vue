<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { ref } from 'vue'
import { durationLabel } from '@/entities/deliverable'
import { VIcon } from '@/shared/ui/icon'
import { VStatus } from '@/shared/ui/status'
import type { ReviewVersion } from '../model/review'

// Figma "Version / V1" of the review: the version's name, upload time and
// decision, the feedback given on it and its files. The head is an item of the
// page's version radio group; the files are a radio group of their own. Picking
// either puts the version in the preview; the picked one has a violet border.
const { version, selected, selectedFile } = defineProps<{
  version: ReviewVersion
  selected: boolean
  selectedFile: string | null
}>()
defineEmits<{ selectFile: [id: string] }>()

// The browser reads each video's length from its metadata.
const durations = ref<Record<string, string>>({})
function onMetadata(id: string, event: Event) {
  const seconds = (event.target as HTMLVideoElement).duration
  if (Number.isFinite(seconds)) durations.value[id] = durationLabel(seconds)
}
</script>

<template>
  <article
    :class="[
      'flex flex-col gap-4 rounded-[10px] border p-4 md:p-[18px]',
      selected ? 'border-violet-400' : 'border-default',
    ]"
  >
    <RadioGroupItem
      :value="version.id"
      :aria-label="`${version.label}, ${version.uploaded}`"
      class="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
    >
      <span class="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
        <span class="text-p3 font-semibold break-words text-brand">{{ version.label }}</span>
        <span class="text-p4 font-medium text-secondary">{{ version.uploaded }}</span>
      </span>
      <VStatus v-if="version.status" :tone="version.status.tone">
        {{ version.status.label }}
      </VStatus>
    </RadioGroupItem>

    <p
      v-if="version.feedback"
      class="rounded-[10px] bg-subtle p-3 text-p3 font-medium whitespace-pre-line break-words text-secondary"
    >
      {{ version.feedback }}
    </p>

    <RadioGroupRoot
      :model-value="selected ? (selectedFile ?? undefined) : undefined"
      :aria-label="`Files of ${version.label}`"
      class="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,130px)]"
      @update:model-value="(value) => $emit('selectFile', value as string)"
    >
      <RadioGroupItem
        v-for="file in version.files"
        :key="file.id"
        :value="file.id"
        :aria-label="file.name"
        class="flex min-w-0 flex-col gap-2.5 rounded-[9px] text-left outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
      >
        <span
          :class="[
            'relative block aspect-[130/95] w-full overflow-hidden rounded-[9px] bg-muted',
            selected && file.id === selectedFile && 'ring-2 ring-violet-400',
          ]"
        >
          <!-- #t=0.1 makes iOS Safari paint a frame without playing. -->
          <video
            v-if="file.video"
            :src="`${file.url}#t=0.1`"
            muted
            playsinline
            preload="metadata"
            class="size-full object-cover"
            @loadedmetadata="onMetadata(file.id, $event)"
          />
          <img v-else :src="file.url" alt="" loading="lazy" class="size-full object-cover" />
          <template v-if="file.video">
            <!-- Figma "CMS / Shared / Play button". -->
            <span
              aria-hidden="true"
              class="absolute inset-0 m-auto flex size-8 items-center justify-center rounded-2xl bg-overlay-scrim text-inverse"
            >
              <VIcon name="play" :size="16" />
            </span>
            <!-- Figma "CMS / Shared / Media badge". -->
            <span
              v-if="durations[file.id]"
              class="absolute right-[7px] bottom-[7px] rounded-md bg-overlay-media px-2 py-1 text-p4 font-medium text-inverse"
            >
              {{ durations[file.id] }}
            </span>
          </template>
        </span>
        <span class="flex min-w-0 flex-col font-medium">
          <span class="truncate text-p2 text-brand">{{ file.name }}</span>
          <span class="text-p3 text-secondary">{{ file.size }}</span>
        </span>
      </RadioGroupItem>
    </RadioGroupRoot>
  </article>
</template>
