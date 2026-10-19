<script setup lang="ts">
import { computed } from 'vue'
import { VAvatar } from '@/shared/ui/avatar'
import { VIcon } from '@/shared/ui/icon'
import { VStatus } from '@/shared/ui/status'
import {
  deliverableStatusChip,
  deliverableTypes,
  formatDueDate,
  type Deliverable,
} from '../model/deliverable'

// Figma "Card / Deliverables" table (desktop) without the Reference column.
// The screen may add a last column of row actions through the slot.
// Header and rows share one grid (rows are subgrids): headers line up with the
// cells and every gap is the same. Columns take the width their content needs
// and nothing is cut off; the first column takes what is left. If the card is
// narrower, the table scrolls sideways. Long names and briefs wrap at 360px.
const { deliverables } = defineProps<{ deliverables: Deliverable[] }>()

const slots = defineSlots<{ action?: (props: { deliverable: Deliverable }) => unknown }>()

const columns = computed(() =>
  slots.action
    ? 'grid-cols-[minmax(200px,1fr)_minmax(64px,auto)_minmax(150px,auto)_minmax(118px,auto)_minmax(96px,auto)_28px]'
    : 'grid-cols-[minmax(200px,1fr)_minmax(64px,auto)_minmax(150px,auto)_minmax(118px,auto)_minmax(96px,auto)]',
)
const row = 'col-span-full grid grid-cols-subgrid items-center'
const headCell = 'text-left text-p3 font-medium text-secondary'
</script>

<template>
  <!-- `relative`: the sr-only header text is absolutely positioned and would
       otherwise escape the scroll box and widen the page. -->
  <div class="relative overflow-x-auto">
    <div
      role="table"
      aria-label="Deliverables"
      :class="['grid w-max min-w-full gap-x-5 whitespace-nowrap', columns]"
    >
      <div role="row" :class="[row, 'h-10']">
        <span role="columnheader" :class="headCell">Deliverable</span>
        <span role="columnheader" :class="headCell">Type</span>
        <span role="columnheader" :class="headCell">Assigned to</span>
        <span role="columnheader" :class="headCell">Status</span>
        <span role="columnheader" :class="headCell">Due date</span>
        <span v-if="slots.action" role="columnheader"><span class="sr-only">Actions</span></span>
      </div>
      <div
        v-for="item in deliverables"
        :key="item.id"
        role="row"
        :class="[row, 'min-h-[100px] border-b border-subtle py-2 last:border-b-0']"
      >
        <div role="cell" class="flex min-w-0 items-center gap-3">
          <!-- TODO(api): thumbnail of the deliverable's content — content uploads don't exist yet. -->
          <span
            class="flex h-15 w-12 shrink-0 items-center justify-center rounded-lg bg-subtle text-tertiary"
            aria-hidden="true"
          >
            <VIcon name="image-01" :size="18" />
          </span>
          <div class="flex max-w-90 min-w-0 flex-col gap-1.5 whitespace-normal">
            <p class="text-p2 font-semibold break-words text-primary">{{ item.name }}</p>
            <p
              v-if="item.brief"
              class="line-clamp-3 text-p3 font-medium break-words text-secondary"
            >
              {{ item.brief }}
            </p>
          </div>
        </div>
        <div role="cell" class="text-p3 font-medium text-secondary">
          {{ deliverableTypes[item.type] }}
        </div>
        <div role="cell" class="min-w-0">
          <div v-if="item.assignee" class="flex items-center gap-2">
            <VAvatar :name="item.assignee.name" :src="item.assignee.photo_url" />
            <span class="text-p3 font-medium text-primary">
              {{ item.assignee.name || 'Unnamed' }}
            </span>
          </div>
          <span v-else class="text-p3 font-medium text-secondary">Unassigned</span>
        </div>
        <div role="cell">
          <VStatus :tone="deliverableStatusChip(item).tone" class="w-full">
            {{ deliverableStatusChip(item).label }}
          </VStatus>
        </div>
        <div role="cell" class="text-p3 font-medium text-secondary">
          {{ formatDueDate(item.dueDate) || '—' }}
        </div>
        <div v-if="slots.action" role="cell">
          <slot name="action" :deliverable="item" />
        </div>
      </div>
    </div>
  </div>
</template>
