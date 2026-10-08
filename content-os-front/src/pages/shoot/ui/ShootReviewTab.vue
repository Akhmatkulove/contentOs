<script setup lang="ts">
import { computed } from 'vue'
import { deliverableStatuses } from '@/entities/deliverable'
import { VAvatar } from '@/shared/ui/avatar'
import { VSearch } from '@/shared/ui/search'
import { VSelect, type SelectOption } from '@/shared/ui/select'
import { VStatus } from '@/shared/ui/status'
import { VThumbnail } from '@/shared/ui/thumbnail'
import {
  assigneesLabel,
  taskSortOptions,
  type ShootTask,
  type TaskFilters,
} from '../model/tasks-tab'
import ReviewButton from './ReviewButton.vue'
import ShootReviewCard from './ShootReviewCard.vue'

// Figma "Shoot / Needs review": deliverables whose content waits for the art
// director (docs/adr/0009). Desktop: a table that scrolls sideways when the card
// is narrower; mobile: cards. Actions (Review) are the art director's only.
// No checkboxes and no row "…" menu (no bulk or row actions yet).
// TODO(api): the uploaded content — Thumbnail, the media badge ("Video · 10–20s")
// and Uploaded come with content uploads; until then a placeholder and "—".
// TODO(ui): "All deliverables" filter and the mobile filters sheet.
const { options, tasks, total, canReview } = defineProps<{
  options: { products: SelectOption[]; assignees: SelectOption[] }
  tasks: ShootTask[]
  total: number
  canReview: boolean
}>()

const filters = defineModel<TaskFilters>('filters', { required: true })

const search = computed({
  get: () => filters.value.search,
  set: (value: string) => (filters.value = { ...filters.value, search: value }),
})

// VSelect emits a plain string; each select only offers its own options.
function set(key: 'productId' | 'assigneeId' | 'sort', value: string | undefined) {
  if (value) filters.value = { ...filters.value, [key]: value }
}

const creators = computed(() =>
  options.assignees.map((option, index) => (index ? option : { ...option, label: 'All creators' })),
)

const headCell = 'pr-4 text-left text-p4 font-medium whitespace-nowrap text-secondary'
const empty = computed(() =>
  total ? 'Nothing matches the search or filters.' : 'Nothing waits for review.',
)
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <section
      aria-label="Search and filters"
      class="flex flex-wrap items-center gap-2.5 rounded-2xl bg-card p-4 shadow-[0_8px_32px_4px_rgb(29_42_60/0.05)] md:p-3 md:shadow-none"
    >
      <VSearch
        v-model="search"
        placeholder="Search deliverable, product, or creator…"
        aria-label="Search deliverables"
        class="min-w-0 flex-1 md:min-w-60"
      />
      <div class="hidden flex-wrap items-center gap-2.5 md:flex">
        <VSelect
          :model-value="filters.productId"
          :options="options.products"
          variant="filter"
          aria-label="Product"
          class="w-[168px]"
          @update:model-value="set('productId', $event)"
        />
        <VSelect
          :model-value="filters.assigneeId"
          :options="creators"
          variant="filter"
          aria-label="Creator"
          class="w-[168px]"
          @update:model-value="set('assigneeId', $event)"
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

    <!-- Desktop: Figma "Card / Needs review". `relative` keeps absolutely positioned
         bits inside the scroll box, so the table can't widen the page. -->
    <section
      aria-label="Needs review"
      class="hidden flex-col rounded-2xl bg-card px-5 pt-5 pb-2 md:flex"
    >
      <div v-if="tasks.length" class="relative overflow-x-auto">
        <table class="w-full min-w-max border-collapse">
          <thead>
            <tr class="h-10 border-b border-subtle">
              <th scope="col" :class="[headCell, 'w-10']">#</th>
              <th scope="col" :class="[headCell, 'min-w-[74px]']">Thumbnail</th>
              <th scope="col" :class="[headCell, 'min-w-[220px]']">Deliverable</th>
              <th scope="col" :class="[headCell, 'min-w-[200px]']">Product</th>
              <th scope="col" :class="[headCell, 'min-w-[120px]']">Creator</th>
              <th scope="col" :class="[headCell, 'min-w-[120px]']">Uploaded</th>
              <th scope="col" :class="[headCell, 'min-w-[142px]']">Status</th>
              <th v-if="canReview" scope="col" :class="[headCell, 'min-w-[100px]']">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(task, index) in tasks"
              :key="task.id"
              class="h-28 border-b border-subtle whitespace-nowrap last:border-b-0"
            >
              <td class="pr-4 text-p3 font-medium text-secondary">{{ index + 1 }}</td>
              <td class="pr-4">
                <VThumbnail :src="null" :icon-size="14" class="h-10 w-8 rounded-lg" />
              </td>
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
                <div v-if="task.assignees[0]" class="flex items-center gap-2">
                  <VAvatar :name="task.assignees[0].name" :src="task.assignees[0].photo_url" />
                  <span class="text-p3 font-medium text-primary">
                    {{ assigneesLabel(task.assignees) }}
                  </span>
                </div>
                <span v-else class="text-p3 font-medium text-secondary">Unassigned</span>
              </td>
              <td class="pr-4 text-p3 font-medium text-secondary">—</td>
              <td class="pr-4">
                <VStatus :tone="deliverableStatuses[task.status].tone" class="min-w-[118px]">
                  {{ deliverableStatuses[task.status].label }}
                </VStatus>
              </td>
              <td v-if="canReview" class="pr-4">
                <ReviewButton :name="task.name" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="py-8 text-center text-p2 font-medium text-secondary">{{ empty }}</p>
      <p class="flex h-10 items-center text-p3 font-medium text-secondary">
        Showing {{ tasks.length }} of {{ total }}
      </p>
    </section>

    <!-- Mobile: Figma "Shoot / Needs review" cards. -->
    <div class="flex flex-col gap-4 md:hidden">
      <ul v-if="tasks.length" class="flex flex-col gap-4">
        <li v-for="task in tasks" :key="task.id">
          <ShootReviewCard :task="task" :can-review="canReview" />
        </li>
      </ul>
      <p v-else class="rounded-2xl bg-card p-8 text-center text-p2 font-medium text-secondary">
        {{ empty }}
      </p>
    </div>
  </div>
</template>
