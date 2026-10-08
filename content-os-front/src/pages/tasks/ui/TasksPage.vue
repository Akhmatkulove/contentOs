<script setup lang="ts">
import { TabsIndicator, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { computed } from 'vue'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VNotificationButton } from '@/shared/ui/notification-button'
import { VPagination } from '@/shared/ui/pagination'
import { VSearch } from '@/shared/ui/search'
import { VSelect } from '@/shared/ui/select'
import { showingLabel, taskSortOptions } from '../model/task'
import { TASKS_PER_PAGE, useTasksList } from '../model/tasks-list'
import TaskCard from './TaskCard.vue'
import TasksTable from './TasksTable.vue'

const {
  role,
  search,
  tab,
  tabs,
  sort,
  shoot,
  product,
  assignee,
  shootOptions,
  productOptions,
  assigneeOptions,
  tasks,
  total,
  loading,
  page,
} = useTasksList()

const artDirector = computed(() => role.value === 'art_director')
const showing = computed(() => showingLabel(tasks.value.length, total.value))
</script>

<!--
  Figma "SCREEN:mt_ad My tasks / Art Director", "SCREEN:mt_cr My tasks / Creator"
  and "MSCREEN:mt_ad My tasks / Art Director" (docs/adr/0011).
  Add deliverable opens Shoots: deliverables are added to a shoot.
  TODO(ui): mobile filters sheet (Figma "CMS / Mobile / Filter button").
  TODO(ui): empty and "nothing found" states — not in Figma yet.
-->
<template>
  <div class="flex flex-col gap-4">
    <!-- Figma "Topbar" (desktop) and the header of "CMS / Mobile / Topbar". -->
    <header class="flex items-center justify-between gap-4 md:min-h-16">
      <div class="flex min-w-0 flex-col gap-1">
        <h1 class="text-h6 text-brand md:text-h3">My tasks</h1>
        <p class="text-p3 font-medium text-secondary md:text-p2">
          <template v-if="artDirector">
            <span class="md:hidden">Review deliverables and keep shoots moving.</span>
            <span class="hidden md:inline">
              Review assigned deliverables, give feedback, and keep shoots moving.
            </span>
          </template>
          <template v-else
            >Your assigned tasks, deliverables and deadlines. Keep creating ✨</template
          >
        </p>
      </div>

      <div class="flex items-center gap-3">
        <VButton v-if="artDirector" as-child size="44" class="hidden md:inline-flex">
          <RouterLink :to="{ name: 'shoots' }">
            <VIcon name="plus-sign" />
            Add deliverable
          </RouterLink>
        </VButton>
        <!-- TODO(ui): mobile topbar in AppLayout (Figma "CMS / Mobile / Topbar"); move the bell there. -->
        <VNotificationButton unread class="lg:hidden" />
      </div>
    </header>

    <!-- Figma "Task filters" (desktop): status tabs over search and filters. -->
    <section
      aria-label="Search and filters"
      class="hidden flex-col gap-3 rounded-2xl bg-card p-3 md:flex"
    >
      <TabsRoot v-model="tab" activation-mode="automatic">
        <TabsList
          aria-label="Task status"
          class="relative flex gap-2 overflow-x-auto border-b border-subtle"
        >
          <TabsTrigger
            v-for="item in tabs"
            :key="item.value"
            :value="item.value"
            class="px-3 py-2.5 text-p2 font-medium whitespace-nowrap text-secondary transition-colors outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-inset data-[state=active]:text-link"
          >
            {{ item.label }} ({{ item.count }})
          </TabsTrigger>
          <TabsIndicator
            class="absolute bottom-0 left-0 h-0.5 w-(--reka-tabs-indicator-size) translate-x-(--reka-tabs-indicator-position) bg-violet-400 transition-[width,translate] duration-200 motion-reduce:transition-none"
          />
        </TabsList>
      </TabsRoot>

      <div class="flex items-center gap-2.5">
        <VSearch
          v-model="search"
          placeholder="Search tasks, products, or shoots…"
          aria-label="Search tasks"
          class="min-w-0 flex-1"
        />
        <template v-if="artDirector">
          <VSelect
            v-model="shoot"
            :options="shootOptions"
            variant="filter"
            aria-label="Shoot"
            searchable
            search-placeholder="Search shoots…"
            class="w-[148px]"
          />
          <VSelect
            v-model="assignee"
            :options="assigneeOptions"
            variant="filter"
            aria-label="Assignee"
            searchable
            search-placeholder="Search people…"
            class="w-[172px]"
          />
        </template>
        <VSelect
          v-model="sort"
          :options="taskSortOptions"
          variant="filter"
          prefix="Sort by:"
          aria-label="Sort"
          :class="artDirector ? 'w-[174px]' : 'w-[176px]'"
        />
        <VSelect
          v-if="!artDirector"
          v-model="product"
          :options="productOptions"
          variant="filter"
          prefix="Product:"
          aria-label="Product"
          searchable
          search-placeholder="Search products…"
          class="w-[144px]"
        />
      </div>
    </section>

    <!-- Figma "Card / Today's schedule" (mobile): search and the status chips. -->
    <section
      aria-label="Search and statuses"
      class="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-[0_8px_32px_4px_rgb(29_42_60/0.05)] md:hidden"
    >
      <VSearch
        v-model="search"
        placeholder="Search tasks, products, or shoots…"
        aria-label="Search tasks"
      />
      <TabsRoot v-model="tab" activation-mode="automatic">
        <TabsList aria-label="Task status" class="scrollbar-none flex gap-1 overflow-x-auto">
          <TabsTrigger
            v-for="item in tabs"
            :key="item.value"
            :value="item.value"
            class="flex h-7 shrink-0 items-center rounded-full px-3 text-p4 font-medium whitespace-nowrap text-secondary outline-none focus-visible:ring-2 focus-visible:ring-violet-300 data-[state=active]:bg-inverse data-[state=active]:text-inverse"
          >
            {{ item.label }} ({{ item.count }})
          </TabsTrigger>
        </TabsList>
      </TabsRoot>
    </section>

    <!-- Figma "btn / New shoot" (mobile), here Add deliverable. -->
    <VButton v-if="artDirector" as-child class="w-full md:hidden">
      <RouterLink :to="{ name: 'shoots' }">
        <VIcon name="plus-sign" />
        Add deliverable
      </RouterLink>
    </VButton>

    <p v-if="loading" class="py-10 text-center text-p2 font-medium text-secondary">Loading…</p>

    <template v-else>
      <!-- Desktop: Figma "Card / Task table". -->
      <section aria-label="Tasks" class="hidden flex-col rounded-2xl bg-card px-5 pt-5 md:flex">
        <TasksTable v-if="tasks.length" :tasks="tasks" :role="role" />
        <p v-else class="py-10 text-center text-p2 font-medium text-secondary">No tasks here.</p>
        <footer
          class="flex min-h-16 items-center justify-between gap-4 border-t border-subtle py-3"
        >
          <p class="text-p3 font-medium text-secondary">{{ showing }}</p>
          <VPagination v-model:page="page" :total="total" :items-per-page="TASKS_PER_PAGE" />
        </footer>
      </section>

      <!-- Mobile: Figma "Task card" count bar, then the cards. -->
      <div class="flex flex-col gap-4 md:hidden">
        <p
          class="flex h-10 items-center justify-between rounded-2xl bg-card px-3.5 text-p3 font-medium text-secondary shadow-[0_8px_32px_4px_rgb(29_42_60/0.05)]"
        >
          <span>Task</span>
          <span>{{ showing }}</span>
        </p>
        <ul v-if="tasks.length" class="flex flex-col gap-4">
          <li v-for="task in tasks" :key="task.id">
            <TaskCard :task="task" :role="role" />
          </li>
        </ul>
        <p v-else class="rounded-2xl bg-card p-8 text-center text-p2 font-medium text-secondary">
          No tasks here.
        </p>
        <VPagination
          v-if="total > TASKS_PER_PAGE"
          v-model:page="page"
          :total="total"
          :items-per-page="TASKS_PER_PAGE"
          class="self-center"
        />
      </div>
    </template>
  </div>
</template>
