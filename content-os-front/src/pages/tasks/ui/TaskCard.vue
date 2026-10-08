<script setup lang="ts">
import { deliverableStatuses } from '@/entities/deliverable'
import { VStatus } from '@/shared/ui/status'
import { VThumbnail } from '@/shared/ui/thumbnail'
import type { Task, TaskRole } from '../model/task'
import TaskAction from './TaskAction.vue'
import TaskAssignees from './TaskAssignees.vue'
import TaskDue from './TaskDue.vue'
import TaskReferences from './TaskReferences.vue'

// Figma "CMS" task card of the mobile My tasks, without the checkbox and "…".
// Assignee and Latest upload are the art director's row.
// TODO(api): the task's upload — preview, format badges ("Reel", "15–30s") and
// Latest upload — come with content uploads; until then a placeholder and "—".
const { task, role } = defineProps<{ task: Task; role: TaskRole }>()
</script>

<template>
  <article
    class="flex flex-col gap-3 rounded-2xl bg-card p-3.5 shadow-[0_8px_32px_4px_rgb(29_42_60/0.05)]"
  >
    <div class="flex items-center gap-3 border-b border-subtle pb-3">
      <VThumbnail :src="null" :icon-size="16" class="h-15 w-12 rounded-lg" />
      <div class="flex min-w-0 flex-col items-start gap-2">
        <h3 class="text-table font-semibold break-words text-primary">{{ task.name }}</h3>
        <VStatus :tone="deliverableStatuses[task.status].tone" :size="20">
          {{ deliverableStatuses[task.status].label }}
        </VStatus>
      </div>
    </div>

    <div class="flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2.5">
        <VThumbnail :src="task.product.photoUrl" :icon-size="14" class="h-10 w-8 rounded-md" />
        <div class="flex min-w-0 flex-col gap-1 text-p3 font-medium">
          <span class="break-words text-primary">{{ task.product.name }}</span>
          <span v-if="task.product.sku" class="text-secondary">{{ task.product.sku }}</span>
        </div>
      </div>
      <TaskReferences :task="task" large class="shrink-0" />
    </div>

    <div class="grid grid-cols-[minmax(0,1fr)_136px] gap-3">
      <div class="flex min-w-0 flex-col gap-1 text-p3 font-medium">
        <span class="break-words text-primary">{{ task.shoot.name }}</span>
        <span class="text-secondary">{{ task.shoot.date }}</span>
      </div>
      <TaskDue :task="task" />
    </div>

    <div v-if="role === 'art_director'" class="grid grid-cols-[minmax(0,1fr)_136px] gap-3">
      <TaskAssignees :task="task" />
      <span class="text-p4 font-medium text-secondary">—</span>
    </div>

    <TaskAction :task="task" :role="role" class="w-full" />
  </article>
</template>
