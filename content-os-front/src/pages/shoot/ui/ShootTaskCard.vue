<script setup lang="ts">
import { deliverableStatuses, formatDueDate } from '@/entities/deliverable'
import { VAvatar } from '@/shared/ui/avatar'
import { VIcon } from '@/shared/ui/icon'
import { VStatus } from '@/shared/ui/status'
import { VThumbnail } from '@/shared/ui/thumbnail'
import { assigneesLabel, type ShootTask } from '../model/tasks-tab'

// Figma "Task / …" card of the mobile Tasks tab, without the checkbox and "…".
// TODO(api): Latest upload row — content uploads come later.
const { task } = defineProps<{ task: ShootTask }>()
</script>

<template>
  <article
    class="flex flex-col gap-4 rounded-2xl bg-card p-4 shadow-[0_8px_16px_rgb(29_42_60/0.05)]"
  >
    <div class="flex flex-col items-start gap-2">
      <h3 class="text-p1 font-semibold break-words text-primary">{{ task.name }}</h3>
      <VStatus :tone="deliverableStatuses[task.status].tone">
        {{ deliverableStatuses[task.status].label }}
      </VStatus>
    </div>

    <dl class="flex flex-col gap-3 rounded-xl bg-subtle p-3">
      <div class="flex items-center gap-3">
        <VThumbnail :src="task.product.photoUrl" :icon-size="14" class="h-10 w-8 rounded-lg" />
        <div class="flex min-w-0 flex-col gap-1">
          <dt class="text-p4 font-medium text-secondary">Product</dt>
          <dd class="text-p2 font-medium break-words text-primary">{{ task.product.name }}</dd>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <VThumbnail
          :src="task.references[0]?.previewUrl ?? null"
          :icon-size="14"
          :placeholder-icon="task.references[0]?.kind !== 'video'"
          class="h-10 w-8 rounded-lg"
        >
          <span
            v-if="task.references[0]?.kind === 'video'"
            class="absolute inset-0 m-auto flex size-5 items-center justify-center rounded-[10px] bg-overlay-scrim text-inverse"
          >
            <VIcon name="play" :size="12" />
          </span>
        </VThumbnail>
        <div class="flex min-w-0 flex-col gap-1">
          <dt class="text-p4 font-medium text-secondary">Reference</dt>
          <dd class="text-p2 font-medium break-words text-primary">
            <template v-if="task.references[0]">
              {{ task.references[0].title }}
              <span v-if="task.references.length > 1" class="text-secondary">
                +{{ task.references.length - 1 }}
              </span>
            </template>
            <span v-else class="text-secondary">—</span>
          </dd>
        </div>
      </div>
    </dl>

    <dl class="grid grid-cols-2 gap-3">
      <div class="flex min-w-0 flex-col gap-2">
        <dt class="text-p4 font-medium text-secondary">Assignee</dt>
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
        <dd class="flex h-7 items-center gap-2 text-p2 font-medium text-primary">
          <VIcon name="calendar-02" :size="16" class="shrink-0 text-secondary" />
          {{ formatDueDate(task.dueDate) || '—' }}
        </dd>
      </div>
    </dl>
  </article>
</template>
