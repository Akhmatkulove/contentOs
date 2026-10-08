<script setup lang="ts">
import { deliverableStatuses } from '@/entities/deliverable'
import { VStatus } from '@/shared/ui/status'
import { VThumbnail } from '@/shared/ui/thumbnail'
import type { Task, TaskRole } from '../model/task'
import TaskAction from './TaskAction.vue'
import TaskAssignees from './TaskAssignees.vue'
import TaskDue from './TaskDue.vue'
import TaskReferences from './TaskReferences.vue'

// Figma "Card / Task table" rows. The art director's row adds Assignee and
// Latest upload. Scrolls sideways when the card is narrower than the columns.
// No checkboxes and no row "…" menu (no bulk or row actions yet).
// TODO(api): the task's upload — preview, format badges ("Reel", "15–30s") and
// Latest upload — come with content uploads; until then a placeholder and "—".
const { tasks, role } = defineProps<{ tasks: Task[]; role: TaskRole }>()

const headCell = 'pr-2 text-left text-p3 font-medium whitespace-nowrap text-secondary'
</script>

<template>
  <!-- `relative` keeps absolutely positioned bits inside the scroll box, so the
       table can't widen the page. -->
  <div class="relative overflow-x-auto">
    <table class="w-full min-w-max border-collapse">
      <thead>
        <tr class="h-10 border-b border-subtle">
          <th scope="col" :class="[headCell, 'min-w-[218px]']">Task</th>
          <th scope="col" :class="[headCell, 'min-w-[152px]']">Product</th>
          <th scope="col" :class="[headCell, 'min-w-[102px]']">Shoot</th>
          <th v-if="role === 'art_director'" scope="col" :class="[headCell, 'min-w-[90px]']">
            Assignee
          </th>
          <th scope="col" :class="[headCell, 'min-w-[108px]']">Reference</th>
          <th scope="col" :class="[headCell, 'min-w-[126px]']">Status</th>
          <th scope="col" :class="[headCell, 'min-w-[94px]']">Due date</th>
          <th v-if="role === 'art_director'" scope="col" :class="[headCell, 'min-w-[94px]']">
            Latest upload
          </th>
          <th scope="col" :class="[headCell, 'min-w-[100px]']">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="task in tasks"
          :key="task.id"
          class="h-22 border-b border-subtle whitespace-nowrap last:border-b-0"
        >
          <th scope="row" class="py-2 pr-2 text-left font-normal">
            <div class="flex items-center gap-2.5">
              <VThumbnail :src="null" :icon-size="14" class="h-12.5 w-10 rounded-md" />
              <span
                class="max-w-60 text-p2 font-semibold whitespace-normal break-words text-primary"
              >
                {{ task.name }}
              </span>
            </div>
          </th>
          <td class="pr-2">
            <div class="flex items-center gap-2">
              <VThumbnail
                :src="task.product.photoUrl"
                :icon-size="12"
                class="h-8.75 w-7 rounded-md"
              />
              <div class="flex flex-col gap-1 font-medium">
                <span class="text-p3 text-primary">{{ task.product.name }}</span>
                <span v-if="task.product.sku" class="text-p4 text-secondary">
                  {{ task.product.sku }}
                </span>
              </div>
            </div>
          </td>
          <td class="pr-2">
            <RouterLink
              :to="{ name: 'shoot', params: { id: task.shoot.id } }"
              class="flex flex-col gap-1 font-medium transition-colors hover:text-brand"
            >
              <span class="text-p3 text-primary">{{ task.shoot.name }}</span>
              <span class="text-p4 text-secondary">{{ task.shoot.date }}</span>
            </RouterLink>
          </td>
          <td v-if="role === 'art_director'" class="max-w-36 pr-2">
            <TaskAssignees :task="task" />
          </td>
          <td class="pr-2">
            <TaskReferences :task="task" />
          </td>
          <td class="pr-2">
            <VStatus :tone="deliverableStatuses[task.status].tone" class="min-w-[118px]">
              {{ deliverableStatuses[task.status].label }}
            </VStatus>
          </td>
          <td class="pr-2">
            <TaskDue :task="task" />
          </td>
          <td v-if="role === 'art_director'" class="pr-2 text-p4 font-medium text-secondary">—</td>
          <td class="pr-2">
            <TaskAction :task="task" :role="role" class="w-[92px]" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
