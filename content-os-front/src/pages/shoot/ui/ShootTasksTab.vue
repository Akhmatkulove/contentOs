<script setup lang="ts">
import { computed } from 'vue'
import { deliverableStatuses, formatDueDate } from '@/entities/deliverable'
import { VAvatar } from '@/shared/ui/avatar'
import { VIcon } from '@/shared/ui/icon'
import { VSearch } from '@/shared/ui/search'
import { VSelect, type SelectOption } from '@/shared/ui/select'
import { VStatus } from '@/shared/ui/status'
import { VThumbnail } from '@/shared/ui/thumbnail'
import { assigneesLabel, taskSortOptions, type ShootTask, type TaskFilters } from '../model/shoot'
import ShootTaskCard from './ShootTaskCard.vue'

// Figma "Shoot / Tasks": the shoot's deliverables as tasks. Desktop: a table
// that scrolls sideways when the card is narrower than its columns; mobile:
// cards. No checkboxes (no bulk actions yet).
// TODO(api): Latest upload column and the row "…" menu — content uploads come later.
// The Approved tab (Figma "Shoot / Approved") is the same table of approved
// deliverables only: no Status filter, and its own count under the table.
// TODO(ui): mobile filters sheet (Figma "CMS / Mobile / Filter button").
const {
  options,
  tasks,
  total,
  approved = false,
} = defineProps<{
  options: { products: SelectOption[]; assignees: SelectOption[]; statuses: SelectOption[] }
  tasks: ShootTask[]
  total: number
  // The Approved tab: every task here is approved.
  approved?: boolean
}>()

const filters = defineModel<TaskFilters>('filters', { required: true })

const search = computed({
  get: () => filters.value.search,
  set: (value: string) => (filters.value = { ...filters.value, search: value }),
})

// VSelect emits a plain string; each select only offers its own options.
function set(key: 'productId' | 'assigneeId' | 'status' | 'sort', value: string | undefined) {
  if (value) filters.value = { ...filters.value, [key]: value }
}

const headCell = 'pr-4 text-left text-p4 font-medium whitespace-nowrap text-secondary'
const showing = (count: number) => `Showing ${count} of ${total} ${total === 1 ? 'task' : 'tasks'}`
// Figma "5 approved deliverables" under the Approved table.
const footer = (count: number) =>
  approved ? `${count} approved ${count === 1 ? 'deliverable' : 'deliverables'}` : showing(count)
const empty = computed(() => {
  if (total) return 'No tasks match the search or filters.'
  return approved ? 'Nothing is approved yet.' : 'No tasks in this shoot.'
})
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <section
      aria-label="Search and filters"
      class="flex flex-wrap items-center gap-2.5 rounded-2xl bg-card p-4 shadow-[0_8px_32px_4px_rgb(29_42_60/0.05)] md:p-3 md:shadow-none"
    >
      <VSearch
        v-model="search"
        placeholder="Search tasks or products…"
        aria-label="Search tasks"
        class="min-w-0 flex-1 md:min-w-60"
      />
      <div class="hidden flex-wrap items-center gap-2.5 md:flex">
        <VSelect
          :model-value="filters.productId"
          :options="options.products"
          variant="filter"
          aria-label="Product"
          class="w-[152px]"
          @update:model-value="set('productId', $event)"
        />
        <VSelect
          :model-value="filters.assigneeId"
          :options="options.assignees"
          variant="filter"
          aria-label="Assignee"
          class="w-[164px]"
          @update:model-value="set('assigneeId', $event)"
        />
        <VSelect
          v-if="!approved"
          :model-value="filters.status"
          :options="options.statuses"
          variant="filter"
          aria-label="Status"
          class="w-[156px]"
          @update:model-value="set('status', $event)"
        />
        <VSelect
          :model-value="filters.sort"
          :options="taskSortOptions"
          variant="filter"
          aria-label="Sort"
          class="w-[172px]"
          @update:model-value="set('sort', $event)"
        />
      </div>
    </section>

    <!-- Desktop: Figma "Card / Shoot tasks". `relative` keeps absolutely positioned
         bits inside the scroll box, so the table can't widen the page. -->
    <section aria-label="Tasks" class="hidden flex-col rounded-2xl bg-card px-5 pt-5 pb-2 md:flex">
      <div v-if="tasks.length" class="relative overflow-x-auto">
        <table class="w-full min-w-max border-collapse">
          <thead>
            <tr class="h-10 border-b border-subtle">
              <th scope="col" :class="[headCell, 'w-10']">#</th>
              <th scope="col" :class="[headCell, 'min-w-[166px]']">Task</th>
              <th scope="col" :class="[headCell, 'min-w-[174px]']">Product</th>
              <th scope="col" :class="[headCell, 'min-w-[74px]']">Reference</th>
              <th scope="col" :class="[headCell, 'min-w-[118px]']">Assigned to</th>
              <th scope="col" :class="[headCell, 'min-w-32']">Status</th>
              <th scope="col" :class="[headCell, 'min-w-25']">Due date</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="task in tasks"
              :key="task.id"
              class="h-25 border-b border-subtle whitespace-nowrap last:border-b-0"
            >
              <td class="pr-4 text-p3 font-medium text-secondary">{{ task.number }}</td>
              <th scope="row" class="py-2 pr-4 text-left text-p2 font-medium text-primary">
                <div class="max-w-80 whitespace-normal break-words">{{ task.name }}</div>
              </th>
              <td class="pr-4">
                <div class="flex items-center gap-2">
                  <VThumbnail
                    :src="task.product.photoUrl"
                    :icon-size="14"
                    class="h-10 w-8 rounded-lg"
                  />
                  <span class="text-p3 font-medium text-primary">{{ task.product.name }}</span>
                </div>
              </td>
              <td class="pr-4">
                <div v-if="task.references[0]" class="flex items-center gap-2">
                  <VThumbnail
                    :src="task.references[0].previewUrl"
                    :icon-size="14"
                    :placeholder-icon="task.references[0].kind !== 'video'"
                    :title="task.references[0].title"
                    class="h-10 w-8 rounded-lg"
                  >
                    <span
                      v-if="task.references[0].kind === 'video'"
                      class="absolute inset-0 m-auto flex size-5 items-center justify-center rounded-[10px] bg-overlay-scrim text-inverse"
                    >
                      <VIcon name="play" :size="12" />
                    </span>
                  </VThumbnail>
                  <span
                    v-if="task.references.length > 1"
                    class="text-p3 font-medium text-secondary"
                  >
                    +{{ task.references.length - 1 }}
                  </span>
                </div>
                <span v-else class="text-p3 font-medium text-secondary">—</span>
              </td>
              <td class="pr-4">
                <div v-if="task.assignees[0]" class="flex items-center gap-2">
                  <VAvatar :name="task.assignees[0].name" :src="task.assignees[0].photo_url" />
                  <span class="text-p3 font-medium text-primary">
                    {{ assigneesLabel(task.assignees) }}
                  </span>
                </div>
                <span v-else class="text-p3 font-medium text-secondary">Unassigned</span>
              </td>
              <td class="pr-4">
                <VStatus :tone="deliverableStatuses[task.status].tone" class="min-w-[118px]">
                  {{ deliverableStatuses[task.status].label }}
                </VStatus>
              </td>
              <td class="pr-4 text-p3 font-medium text-secondary">
                {{ formatDueDate(task.dueDate) || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="py-8 text-center text-p2 font-medium text-secondary">
        {{ empty }}
      </p>
      <p class="flex h-10 items-center text-p3 font-medium text-secondary">
        {{ footer(tasks.length) }}
      </p>
    </section>

    <!-- Mobile: Figma "Shoot / Tasks" cards under a count bar. -->
    <div class="flex flex-col gap-4 md:hidden">
      <!-- Figma's Approved screen has no count bar. -->
      <p
        v-if="!approved"
        class="flex h-12 items-center justify-between rounded-2xl bg-card px-4 text-p3 font-medium text-secondary shadow-[0_8px_32px_4px_rgb(29_42_60/0.05)]"
      >
        <span>Task</span>
        <span>{{ showing(tasks.length) }}</span>
      </p>
      <ul v-if="tasks.length" class="flex flex-col gap-4">
        <li v-for="task in tasks" :key="task.id">
          <ShootTaskCard :task="task" />
        </li>
      </ul>
      <p v-else class="rounded-2xl bg-card p-8 text-center text-p2 font-medium text-secondary">
        {{ empty }}
      </p>
    </div>
  </div>
</template>
