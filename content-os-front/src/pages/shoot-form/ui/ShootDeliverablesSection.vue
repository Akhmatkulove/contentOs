<script setup lang="ts">
import { useId } from 'vue'
import { deliverableStatuses, formatDueDate } from '@/entities/deliverable'
import { VAvatar } from '@/shared/ui/avatar'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VSectionCard } from '@/shared/ui/section-card'
import { VStatus } from '@/shared/ui/status'
import { firstAndMore, type ShootDeliverable } from '../model/shoot-draft'
import MediaPreview from './MediaPreview.vue'
import ShootDeliverableCard from './ShootDeliverableCard.vue'

// Figma "Card / Deliverables for this shoot". Desktop: a table inside the card.
// Mobile: the card holds only the title and "Add deliverable"; the rows follow
// it as separate cards (Figma "Task / …"). Checkboxes of the Figma rows are left
// out: a deliverable added to the shoot is in it until removed with ×.
const { deliverables, error } = defineProps<{
  deliverables: ShootDeliverable[]
  // "Add at least one deliverable."; empty while fine.
  error?: string
}>()

// "Add deliverable": the form opens the modal; × takes a deliverable out.
const emit = defineEmits<{ add: []; remove: [id: string] }>()

const errorId = useId()

const headCell = 'pr-3 text-left text-p4 font-medium text-secondary'
</script>

<template>
  <VSectionCard
    title="Deliverables for this shoot"
    description="Select and assign deliverables for the selected products."
    required
  >
    <template #action>
      <!-- Carries the error: a failed submit focuses it and screen readers read why. -->
      <VButton
        variant="secondary"
        class="h-11 w-full md:h-10 md:w-auto"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="error ? errorId : undefined"
        @click="emit('add')"
      >
        <VIcon name="plus-sign" />
        Add deliverable
      </VButton>
    </template>

    <p
      v-if="!deliverables.length"
      :class="[
        'flex h-[117px] items-center justify-center rounded-[20px] bg-subtle p-8 text-center text-p1 font-medium text-secondary',
        error && 'border border-red-400',
      ]"
    >
      The deliverables you add will be displayed here
    </p>

    <!-- Scrolls sideways if the card can't fit the columns. -->
    <div v-else class="hidden overflow-x-auto md:block">
      <table class="w-full min-w-[1000px] table-fixed border-collapse">
        <caption class="sr-only">
          Deliverables for this shoot
        </caption>
        <colgroup>
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
              <div v-if="item.references[0]" class="flex items-center gap-2">
                <MediaPreview
                  :src="item.references[0].previewUrl"
                  :icon-size="14"
                  class="h-10 w-8 rounded-lg"
                />
                <span class="truncate text-p3 font-medium text-secondary">
                  {{ firstAndMore(item.references.map((reference) => reference.title)) }}
                </span>
              </div>
              <span v-else class="text-p3 font-medium text-secondary">—</span>
            </td>
            <td class="pr-3">
              <div v-if="item.assignees.length" class="flex items-center gap-2">
                <span class="flex shrink-0 -space-x-2">
                  <VAvatar
                    v-for="member in item.assignees.slice(0, 3)"
                    :key="member.id"
                    :name="member.name"
                    :src="member.photo_url"
                    class="ring-2 ring-card"
                  />
                </span>
                <span class="truncate text-p3 font-medium text-primary">
                  {{ firstAndMore(item.assignees.map((member) => member.name || 'Unnamed')) }}
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
              <VStatus :tone="deliverableStatuses[item.status].tone" class="w-[118px]">
                {{ deliverableStatuses[item.status].label }}
              </VStatus>
            </td>
            <td class="text-right">
              <VButton
                variant="ghost"
                size="icon-24"
                :aria-label="`Remove ${item.name}`"
                class="size-7 text-secondary hover:text-primary"
                @click="emit('remove', item.id)"
              >
                <VIcon name="multiplication-sign" :size="16" />
              </VButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="error" :id="errorId" class="text-p3 font-medium text-red-400">{{ error }}</p>
  </VSectionCard>

  <!-- Mobile rows, outside the card as in Figma. -->
  <ul
    v-if="deliverables.length"
    aria-label="Deliverables for this shoot"
    class="flex flex-col gap-4 md:hidden"
  >
    <li v-for="item in deliverables" :key="item.id">
      <ShootDeliverableCard :deliverable="item" @remove="emit('remove', item.id)" />
    </li>
  </ul>
</template>
