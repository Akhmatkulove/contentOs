<script setup lang="ts">
import { VIcon } from '@/shared/ui/icon'
import { VThumbnail } from '@/shared/ui/thumbnail'
import type { Task } from '../model/task'

// Figma "Reference": the first references as thumbnails, then "+N".
// `large`: the 32×40 thumbnails of the mobile card; the table's are 24×30.
const { task, large = false } = defineProps<{ task: Task; large?: boolean }>()
</script>

<template>
  <div v-if="task.references.length || task.moreReferences" class="flex items-center gap-1">
    <VThumbnail
      v-for="reference in task.references"
      :key="reference.id"
      :src="reference.previewUrl"
      :icon-size="12"
      :placeholder-icon="reference.kind !== 'video'"
      :title="reference.title"
      :class="['rounded-md', large ? 'h-10 w-8' : 'h-7.5 w-6']"
    >
      <span
        v-if="reference.kind === 'video'"
        class="absolute inset-0 m-auto flex size-5 items-center justify-center rounded-[10px] bg-overlay-scrim text-inverse"
      >
        <VIcon name="play" :size="12" />
      </span>
    </VThumbnail>
    <span
      v-if="task.moreReferences"
      :class="[
        'flex items-center justify-center rounded-md bg-subtle text-p3 font-medium text-secondary',
        large ? 'h-10 w-7' : 'h-7.5 min-w-6 px-0.5',
      ]"
    >
      +{{ task.moreReferences }}
    </span>
  </div>
  <span v-else class="text-p3 font-medium text-secondary">—</span>
</template>
