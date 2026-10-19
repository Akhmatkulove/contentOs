<script setup lang="ts">
import {
  deliverableInWork,
  deliverableStatusChip,
  DeliverablesTable,
  deliverableTypes,
  formatDueDate,
  type Deliverable,
} from '@/entities/deliverable'
import { VAvatar } from '@/shared/ui/avatar'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VStatus } from '@/shared/ui/status'

// Mobile: Figma "CMS / Mobile / Task card" (Deliverable) without the checkbox and
// the product/reference block, a cross instead of "…".
// Desktop: the deliverables table with a cross in the last column.
const { deliverables, disabled = false } = defineProps<{
  deliverables: Deliverable[]
  disabled?: boolean
}>()

const emit = defineEmits<{ remove: [id: string] }>()

// A deliverable a shoot already works on can't be removed (docs/adr/0021): the
// cross is off and says why.
const removeLabel = (item: Deliverable) =>
  deliverableInWork(item)
    ? `${item.name} is in work in a shoot and can't be removed`
    : `Remove ${item.name}`
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
          <div class="flex items-center gap-2">
            <VStatus :tone="deliverableStatusChip(item).tone" :size="24">
              {{ deliverableStatusChip(item).label }}
            </VStatus>
            <span class="text-p4 font-medium text-secondary">{{
              deliverableTypes[item.type]
            }}</span>
          </div>
        </div>
        <VButton
          variant="ghost"
          size="icon-24"
          :aria-label="removeLabel(item)"
          :disabled="disabled || deliverableInWork(item)"
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
              <VAvatar :name="item.assignee.name" :src="item.assignee.photo_url" />
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

  <DeliverablesTable :deliverables="deliverables" class="hidden md:block">
    <template #action="{ deliverable }">
      <VButton
        variant="ghost"
        size="icon-24"
        :aria-label="removeLabel(deliverable)"
        :disabled="disabled || deliverableInWork(deliverable)"
        class="size-7"
        @click="emit('remove', deliverable.id)"
      >
        <VIcon name="multiplication-sign" :size="14" />
      </VButton>
    </template>
  </DeliverablesTable>
</template>
