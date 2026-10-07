<script setup lang="ts">
import { computed } from 'vue'
import { formatDueDate } from '@/entities/deliverable'
import { VAvatar } from '@/shared/ui/avatar'
import { VButton } from '@/shared/ui/button'
import { VCheckbox } from '@/shared/ui/checkbox'
import { VIcon } from '@/shared/ui/icon'
import { VSectionCard } from '@/shared/ui/section-card'
import { VStatus } from '@/shared/ui/status'
import {
  selectAllState,
  shootDeliverableStatuses,
  toggleSelection,
  type ShootDeliverable,
} from '../model/shoot-draft'
import MediaPreview from './MediaPreview.vue'
import ShootDeliverableCard from './ShootDeliverableCard.vue'

// Figma "Card / Deliverables for this shoot". Desktop: a table inside the card.
// Mobile: the card holds only the title and "Add deliverable"; the rows follow
// it as separate cards (Figma "Task card" header and "Task / …").
const { deliverables } = defineProps<{ deliverables: ShootDeliverable[] }>()

const selected = defineModel<string[]>('selected', { required: true })

const allSelected = computed(() => selectAllState(selected.value.length, deliverables.length))

function setAll(value: boolean | 'indeterminate') {
  selected.value = value === true ? deliverables.map((item) => item.id) : []
}

function isSelected(id: string) {
  return selected.value.includes(id)
}

function setSelected(id: string, value: boolean | 'indeterminate') {
  selected.value = toggleSelection(selected.value, id, value === true)
}

const headCell = 'pr-3 text-left text-p4 font-medium text-secondary'
</script>

<template>
  <VSectionCard
    title="Deliverables for this shoot"
    description="Select and assign deliverables for the selected products."
  >
    <template #action>
      <!-- TODO(ui): add-deliverable modal for a shoot. -->
      <VButton variant="secondary" class="h-11 w-full md:h-10 md:w-auto">
        <VIcon name="plus-sign" />
        Add deliverable
      </VButton>
    </template>

    <!-- Scrolls sideways if the card can't fit the columns. -->
    <div class="hidden overflow-x-auto md:block">
      <table class="w-full min-w-[1000px] table-fixed border-collapse">
        <caption class="sr-only">
          Deliverables for this shoot
        </caption>
        <colgroup>
          <col class="w-8" />
          <col class="w-8" />
          <col class="w-48" />
          <col class="w-44" />
          <col class="w-48" />
          <col class="w-[162px]" />
          <col class="w-[138px]" />
          <col class="w-[136px]" />
          <col />
        </colgroup>
        <thead>
          <tr class="h-10">
            <th scope="col" :class="headCell">
              <VCheckbox
                :model-value="allSelected"
                aria-label="Select all deliverables"
                class="align-middle"
                @update:model-value="setAll"
              />
            </th>
            <th scope="col" :class="headCell">#</th>
            <th scope="col" :class="headCell">Deliverable</th>
            <th scope="col" :class="headCell">Product</th>
            <th scope="col" :class="headCell">Reference</th>
            <th scope="col" :class="headCell">Assignee(s)</th>
            <th scope="col" :class="headCell">Due date</th>
            <th scope="col" :class="headCell">Status</th>
            <th scope="col"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, index) in deliverables"
            :key="item.id"
            class="h-[76px] border-b border-subtle last:border-b-0"
          >
            <td class="pr-3">
              <VCheckbox
                :model-value="isSelected(item.id)"
                :aria-label="`Select ${item.name}`"
                class="align-middle"
                @update:model-value="setSelected(item.id, $event)"
              />
            </td>
            <td class="pr-3 text-p3 font-medium text-secondary">{{ index + 1 }}</td>
            <th scope="row" class="truncate pr-3 text-left text-p2 font-medium text-primary">
              {{ item.name }}
            </th>
            <td class="pr-3">
              <div class="flex items-center gap-2">
                <MediaPreview
                  :src="item.product.photoUrl"
                  :icon-size="14"
                  class="h-10 w-8 rounded-lg"
                />
                <span class="truncate text-p3 font-medium text-primary">{{
                  item.product.name
                }}</span>
              </div>
            </td>
            <td class="pr-3">
              <div class="flex items-center gap-2">
                <MediaPreview
                  :src="item.reference.previewUrl"
                  :icon-size="14"
                  class="h-10 w-8 rounded-lg"
                />
                <span class="truncate text-p3 font-medium text-secondary">
                  {{ item.reference.title }}
                </span>
              </div>
            </td>
            <td class="pr-3">
              <div v-if="item.assignee" class="flex items-center gap-2">
                <VAvatar :name="item.assignee.name" :src="item.assignee.photo_url" />
                <span class="truncate text-p3 font-medium text-primary">
                  {{ item.assignee.name || 'Unnamed' }}
                </span>
              </div>
              <span v-else class="text-p3 font-medium text-secondary">Unassigned</span>
            </td>
            <td class="pr-3">
              <div class="flex items-center gap-1.5 text-p4 font-medium text-secondary">
                <VIcon name="calendar-02" :size="16" class="shrink-0" />
                {{ formatDueDate(item.dueDate) || '—' }}
              </div>
            </td>
            <td class="pr-3">
              <VStatus :tone="shootDeliverableStatuses[item.status].tone" class="w-[118px]">
                {{ shootDeliverableStatuses[item.status].label }}
              </VStatus>
            </td>
            <td class="text-right">
              <!-- TODO(ui): the deliverable's actions menu. -->
              <VButton
                variant="ghost"
                size="icon-24"
                :aria-label="`More actions for ${item.name}`"
                class="size-7"
              >
                <VIcon name="more-horizontal" :size="16" />
              </VButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </VSectionCard>

  <!-- Mobile rows, outside the card as in Figma. -->
  <div class="flex flex-col gap-4 md:hidden">
    <!-- Figma "Task card": the select-all row. -->
    <label class="flex h-10 items-center gap-3 rounded-[20px] bg-card px-3.5">
      <VCheckbox :model-value="allSelected" @update:model-value="setAll" />
      <span class="text-p3 font-medium text-secondary">Task</span>
      <span class="sr-only">— select all deliverables</span>
    </label>
    <ul aria-label="Deliverables for this shoot" class="flex flex-col gap-4">
      <li v-for="item in deliverables" :key="item.id">
        <ShootDeliverableCard
          :deliverable="item"
          :selected="isSelected(item.id)"
          @update:selected="setSelected(item.id, $event)"
        />
      </li>
    </ul>
  </div>
</template>
