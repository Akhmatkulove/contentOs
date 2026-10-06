<script setup lang="ts">
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VStatus } from '@/shared/ui/status'
import {
  deliverableStatuses,
  formatDueDate,
  type DeliverableDraft,
} from '../model/deliverable-draft'
import AssigneeAvatar from './AssigneeAvatar.vue'

// Mobile: Figma "CMS / Mobile / Task card" (Deliverable) without the checkbox and
// the product/reference block, a cross instead of "…".
// Desktop: Figma "Card / Deliverables" table without the Type and Reference columns.
// Header and rows share one grid of fixed-width columns spread with
// justify-between: headers line up with the cells and every gap is the same.
const { deliverables, disabled = false } = defineProps<{
  deliverables: DeliverableDraft[]
  disabled?: boolean
}>()

const emit = defineEmits<{ remove: [id: string] }>()

const row = 'grid grid-cols-[280px_160px_118px_96px_28px] items-center justify-between gap-x-2.5'
const headCell = 'text-left text-p3 font-medium text-secondary'
</script>

<template>
  <ul class="flex flex-col gap-3 md:hidden">
    <li
      v-for="item in deliverables"
      :key="item.id"
      class="flex flex-col gap-4 rounded-[20px] bg-card p-4 shadow-[0_8px_32px_4px_rgb(29_42_60/0.05)]"
    >
      <div class="flex items-start gap-3">
        <div class="flex min-w-0 flex-1 flex-col items-start gap-2">
          <p class="w-full text-p1 font-semibold text-primary">{{ item.name }}</p>
          <p v-if="item.brief" class="w-full text-p3 font-medium text-secondary">
            {{ item.brief }}
          </p>
          <VStatus :tone="deliverableStatuses[item.status].tone" :size="24">
            {{ deliverableStatuses[item.status].label }}
          </VStatus>
        </div>
        <VButton
          variant="ghost"
          size="icon-24"
          :aria-label="`Remove ${item.name}`"
          :disabled="disabled"
          class="w-7"
          @click="emit('remove', item.id)"
        >
          <VIcon name="multiplication-sign" :size="16" />
        </VButton>
      </div>
      <dl class="grid grid-cols-2 gap-4">
        <div class="flex min-w-0 flex-col gap-2">
          <dt class="text-p4 font-medium text-secondary">Assignee</dt>
          <dd class="flex h-7 items-center gap-2 text-table font-medium text-primary">
            <template v-if="item.assignee">
              <AssigneeAvatar :member="item.assignee" />
              <span class="truncate">{{ item.assignee.name || 'Unnamed' }}</span>
            </template>
            <span v-else class="text-secondary">Unassigned</span>
          </dd>
        </div>
        <div class="flex min-w-0 flex-col gap-2">
          <dt class="text-p4 font-medium text-secondary">Due date</dt>
          <dd class="flex h-7 items-center gap-2 text-table font-medium text-primary">
            <VIcon name="calendar-02" :size="16" class="shrink-0 text-secondary" />
            {{ formatDueDate(item.dueDate) || '—' }}
          </dd>
        </div>
      </dl>
    </li>
  </ul>

  <!-- Scrolls sideways if a narrow desktop can't fit the columns. -->
  <div class="hidden overflow-x-auto md:block">
    <div role="table" aria-label="Deliverables" class="min-w-[722px]">
      <div role="row" :class="[row, 'h-10']">
        <span role="columnheader" :class="headCell">Deliverable</span>
        <span role="columnheader" :class="headCell">Assigned to</span>
        <span role="columnheader" :class="headCell">Status</span>
        <span role="columnheader" :class="headCell">Due date</span>
        <span role="columnheader"><span class="sr-only">Actions</span></span>
      </div>
      <div
        v-for="item in deliverables"
        :key="item.id"
        role="row"
        :class="[row, 'h-[100px] border-b border-subtle']"
      >
        <div role="cell" class="flex min-w-0 items-center gap-3">
          <!-- TODO(api): thumbnail of the deliverable's content once shoots upload it. -->
          <span
            class="flex h-15 w-12 shrink-0 items-center justify-center rounded-lg bg-subtle text-tertiary"
            aria-hidden="true"
          >
            <VIcon name="image-01" :size="18" />
          </span>
          <div class="flex min-w-0 flex-col gap-1.5">
            <p class="truncate text-p2 font-semibold text-primary">{{ item.name }}</p>
            <p v-if="item.brief" class="truncate text-p3 font-medium text-secondary">
              {{ item.brief }}
            </p>
          </div>
        </div>
        <div role="cell" class="min-w-0">
          <div v-if="item.assignee" class="flex items-center gap-2">
            <AssigneeAvatar :member="item.assignee" />
            <span class="truncate text-p3 font-medium text-primary">
              {{ item.assignee.name || 'Unnamed' }}
            </span>
          </div>
          <span v-else class="text-p3 font-medium text-secondary">Unassigned</span>
        </div>
        <div role="cell">
          <VStatus :tone="deliverableStatuses[item.status].tone" class="w-full">
            {{ deliverableStatuses[item.status].label }}
          </VStatus>
        </div>
        <div role="cell" class="text-p3 font-medium text-secondary">
          {{ formatDueDate(item.dueDate) || '—' }}
        </div>
        <div role="cell">
          <VButton
            variant="ghost"
            size="icon-24"
            :aria-label="`Remove ${item.name}`"
            :disabled="disabled"
            class="size-7"
            @click="emit('remove', item.id)"
          >
            <VIcon name="multiplication-sign" :size="14" />
          </VButton>
        </div>
      </div>
    </div>
  </div>
</template>
