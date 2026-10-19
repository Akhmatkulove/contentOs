<script setup lang="ts">
import { deliverableStatuses, formatDueDate } from '@/entities/deliverable'
import { VAvatar } from '@/shared/ui/avatar'
import { VIcon } from '@/shared/ui/icon'
import { VStatus } from '@/shared/ui/status'
import { VThumbnail } from '@/shared/ui/thumbnail'
import { assigneesLabel, type ShootTask } from '../model/tasks-tab'
import ReviewButton from './ReviewButton.vue'

// Figma "Review / …" card of the mobile Needs review tab, without the checkbox
// and "…". Review is the art director's only.
// TODO(api): the uploaded content (thumbnail, media badges, upload time) comes
// with content uploads; until then a placeholder.
const { task, canReview } = defineProps<{ task: ShootTask; canReview: boolean }>()
</script>

<template>
  <article
    class="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-[0_8px_16px_rgb(29_42_60/0.05)]"
  >
    <div class="flex items-center gap-3 border-b border-subtle pb-3">
      <VThumbnail :src="null" :icon-size="18" class="size-15 rounded-lg" />
      <div class="flex min-w-0 flex-col items-start gap-2">
        <h3 class="text-p2 font-semibold break-words text-primary">{{ task.name }}</h3>
        <VStatus :tone="deliverableStatuses[task.status].tone">
          {{ deliverableStatuses[task.status].label }}
        </VStatus>
      </div>
    </div>

    <div class="flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <VThumbnail :src="task.product.photoUrl" :icon-size="14" class="h-10 w-8 rounded-lg" />
        <span class="text-p2 font-medium break-words text-primary">{{ task.product.name }}</span>
      </div>
      <!-- The references to follow, as small thumbnails. -->
      <div v-if="task.references.length" class="flex shrink-0 items-center gap-1">
        <VThumbnail
          v-for="reference in task.references.slice(0, 3)"
          :key="reference.id"
          :src="reference.previewUrl"
          :icon-size="12"
          :placeholder-icon="reference.kind !== 'video'"
          :title="reference.title"
          class="h-10 w-8 rounded-md"
        >
          <span
            v-if="reference.kind === 'video'"
            class="absolute inset-0 m-auto flex size-5 items-center justify-center rounded-[10px] bg-overlay-scrim text-inverse"
          >
            <VIcon name="play" :size="12" />
          </span>
        </VThumbnail>
        <span
          v-if="task.references.length > 3"
          class="flex h-10 w-8 items-center justify-center rounded-md bg-subtle text-p4 font-medium text-secondary"
        >
          +{{ task.references.length - 3 }}
        </span>
      </div>
    </div>

    <dl class="grid grid-cols-2 gap-3">
      <div class="flex min-w-0 flex-col gap-2">
        <dt class="text-p4 font-medium text-secondary">Creator</dt>
        <dd v-if="task.assignees[0]" class="flex min-w-0 items-center gap-2">
          <VAvatar :name="task.assignees[0].name" :src="task.assignees[0].photo_url" />
          <span class="truncate text-p2 font-medium text-primary">
            {{ assigneesLabel(task.assignees) }}
          </span>
        </dd>
        <dd v-else class="text-p2 font-medium text-secondary">Unassigned</dd>
      </div>
      <div class="flex flex-col gap-2">
        <dt class="text-p4 font-medium text-secondary">Due date</dt>
        <dd class="flex h-7 items-center text-p2 font-medium text-primary">
          {{ formatDueDate(task.dueDate) || '—' }}
        </dd>
      </div>
    </dl>

    <ReviewButton v-if="canReview" :id="task.id" :name="task.name" class="h-10 w-full" />
  </article>
</template>
