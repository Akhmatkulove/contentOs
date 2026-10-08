<script setup lang="ts">
import { TabsContent, TabsIndicator, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { useTemplateRef } from 'vue'
import { useActiveTabInView } from '@/shared/lib'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VStatus } from '@/shared/ui/status'
import { useProductsTab } from '../model/products-tab'
import { useReferencesTab } from '../model/references-tab'
import { useShootNotes } from '../model/shoot-notes'
import { useShootPage } from '../model/shoot-page'
import { useTaskList } from '../model/tasks-tab'
import { useTeamTab } from '../model/team-tab'
import ShootOverview from './ShootOverview.vue'
import ShootProductsTab from './ShootProductsTab.vue'
import ShootReferencesTab from './ShootReferencesTab.vue'
import ShootNotesTab from './ShootNotesTab.vue'
import ShootReviewTab from './ShootReviewTab.vue'
import ShootTeamTab from './ShootTeamTab.vue'
import ShootTasksTab from './ShootTasksTab.vue'

// The route's :id.
const { id } = defineProps<{ id: string }>()

const {
  shoot,
  loading,
  error,
  notFound,
  tab,
  tabs,
  canEdit,
  canReview,
  status,
  facts,
  products,
  tasks,
  reviewTasks,
  approvedTasks,
  people,
  counts,
  covers,
  taskOptions,
} = useShootPage(() => id)
useActiveTabInView(useTemplateRef('tabList'), tab)

const editRoute = { name: 'shoot-edit', params: { id } }

// Each tab keeps its search and filters while the user switches between tabs.
const {
  search: productSearch,
  sort: productSort,
  found: foundProducts,
} = useProductsTab(() => products.value)
const { filters: taskFilters, found: foundTasks } = useTaskList(() => tasks.value)
const { filters: reviewFilters, found: foundReviewTasks } = useTaskList(() => reviewTasks.value)
const { filters: approvedFilters, found: foundApprovedTasks } = useTaskList(
  () => approvedTasks.value,
)
const {
  filters: referenceFilters,
  found: foundReferences,
  uses: referenceUses,
  productOptions: referenceProducts,
} = useReferencesTab(
  () => shoot.value,
  () => products.value,
)
const {
  search: teamSearch,
  role: teamRole,
  cards: team,
  found: foundTeam,
  summary,
} = useTeamTab(() => shoot.value)

// Notes load when their tab opens; anyone on the team can be assigned.
const notesTab = useShootNotes(
  () => id,
  () => people.value.map((person) => person.member),
  () => tab.value === 'notes',
)
const {
  notes: allNotes,
  loading: notesLoading,
  search: noteSearch,
  filter: noteFilter,
  pinned: pinnedNotes,
  others: otherNotes,
  openForm,
  pin,
  remove,
} = notesTab
</script>

<!--
  Figma "Shoot / …" screens, one per tab (desktop and mobile). Edit is the
  author's (the art director who created the shoot).
  TODO(ui): the "…" menu of the header — comes later.
-->
<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <!-- TODO(ui): mobile topbar in AppLayout (Figma "CMS / Mobile / Topbar", Back
         variant with Edit); until then the page draws it. -->
    <div class="mb-4 flex min-h-11 items-center justify-between gap-4 md:mb-0 md:min-h-0">
      <RouterLink
        :to="{ name: 'shoots' }"
        class="flex items-center gap-1.5 text-p3 font-medium text-secondary transition-colors hover:text-brand"
      >
        <VIcon name="arrow-left-02-sharp" :size="14" />
        Back to shoots
      </RouterLink>
      <VButton
        v-if="canEdit"
        as-child
        variant="surface"
        class="h-11 gap-2 px-3.5 text-p2 font-semibold text-link md:hidden"
      >
        <RouterLink :to="editRoute">
          <VIcon name="edit-02" :size="14" />
          Edit
        </RouterLink>
      </VButton>
    </div>

    <p v-if="loading" class="py-10 text-center text-p2 font-medium text-secondary">Loading…</p>

    <p v-else-if="!shoot" class="py-10 text-center text-p2 font-medium text-secondary">
      {{
        notFound
          ? 'This shoot doesn’t exist or you’re not on its team.'
          : error
            ? 'Couldn’t load the shoot. Please try again.'
            : ''
      }}
    </p>

    <template v-else>
      <!-- Figma "Shoot header". -->
      <header class="-mt-1 flex items-center justify-between gap-4 md:mt-0">
        <div class="flex min-w-0 flex-col gap-2">
          <h1 class="text-h4 break-words text-primary md:text-h3">{{ shoot.name }}</h1>
          <div
            v-if="facts"
            class="flex flex-wrap items-center gap-x-3.5 gap-y-2 text-p3 font-medium text-secondary"
          >
            <span class="flex items-center gap-1.5">
              <VIcon name="calendar-02" :size="16" />
              {{ facts.date }}
            </span>
            <span v-if="facts.location" class="flex min-w-0 items-center gap-1.5">
              <VIcon name="location-01" :size="16" class="shrink-0" />
              <span class="truncate">{{ facts.location }}</span>
            </span>
            <VStatus v-if="status" :tone="status.tone">{{ status.label }}</VStatus>
          </div>
        </div>
        <VButton
          v-if="canEdit"
          as-child
          variant="secondary"
          class="hidden shrink-0 md:inline-flex md:px-5"
        >
          <RouterLink :to="editRoute">
            <VIcon name="edit-02" />
            Edit shoot
          </RouterLink>
        </VButton>
      </header>

      <TabsRoot v-model="tab" class="flex flex-col gap-4 md:gap-5">
        <!-- Mobile: Figma "CMS / Mobile / Tab", underlined and scrolling sideways;
             desktop: "Shoot tabs" in a card. One underline slides between them
             (Reka sizes it to the active one); the mobile bottom line is an inset
             shadow so the underline covers it inside the scroll box. -->
        <TabsList
          ref="tabList"
          aria-label="Shoot"
          class="scrollbar-none relative flex overflow-x-auto shadow-[inset_0_-2px_0_var(--border-color-strong)] md:gap-1.5 md:rounded-2xl md:bg-card md:p-2 md:shadow-none"
        >
          <TabsTrigger
            v-for="item in tabs"
            :key="item.value"
            :value="item.value"
            class="flex shrink-0 items-center justify-center px-4 py-2 text-p2 font-medium whitespace-nowrap text-tertiary transition-colors outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-inset data-[state=active]:text-primary md:h-9 md:px-3 md:py-0 md:text-secondary md:data-[state=active]:text-link"
          >
            {{ item.label }}
          </TabsTrigger>
          <TabsIndicator
            class="absolute bottom-0 left-0 h-0.5 w-(--reka-tabs-indicator-size) translate-x-(--reka-tabs-indicator-position) bg-neutral-900 transition-[width,translate] duration-200 motion-reduce:transition-none md:bottom-2 md:bg-violet-400"
          />
        </TabsList>

        <TabsContent value="overview" class="outline-none">
          <ShootOverview
            :shoot="shoot"
            :products="products"
            :people="people"
            :counts="counts"
            :covers="covers"
            :facts="facts!"
          />
        </TabsContent>

        <TabsContent value="products" class="outline-none">
          <ShootProductsTab
            v-model:search="productSearch"
            v-model:sort="productSort"
            :products="foundProducts"
            :total="products.length"
            :can-open-products="canEdit"
          />
        </TabsContent>

        <TabsContent value="tasks" class="outline-none">
          <ShootTasksTab
            v-model:filters="taskFilters"
            :options="taskOptions"
            :tasks="foundTasks"
            :total="tasks.length"
          />
        </TabsContent>

        <TabsContent value="needs_review" class="outline-none">
          <ShootReviewTab
            v-model:filters="reviewFilters"
            :options="taskOptions"
            :tasks="foundReviewTasks"
            :total="reviewTasks.length"
            :can-review="canReview"
          />
        </TabsContent>

        <TabsContent value="approved" class="outline-none">
          <ShootTasksTab
            v-model:filters="approvedFilters"
            :options="taskOptions"
            :tasks="foundApprovedTasks"
            :total="approvedTasks.length"
            approved
          />
        </TabsContent>

        <TabsContent value="references" class="outline-none">
          <ShootReferencesTab
            v-model:filters="referenceFilters"
            :references="foundReferences"
            :total="shoot.references.length"
            :products="referenceProducts"
            :uses="referenceUses"
          />
        </TabsContent>

        <!-- TODO(api): the shoot's files (shot lists, briefs, addresses) — no uploads yet. -->
        <TabsContent value="files" class="outline-none">
          <p class="rounded-2xl bg-card p-8 text-center text-p2 font-medium text-secondary">
            Files of this shoot will show up here.
          </p>
        </TabsContent>

        <TabsContent value="team" class="outline-none">
          <ShootTeamTab
            v-model:search="teamSearch"
            v-model:role="teamRole"
            :members="foundTeam"
            :total="team.length"
            :summary="summary"
            :add-to="canEdit ? editRoute : null"
          />
        </TabsContent>

        <TabsContent value="notes" class="outline-none">
          <ShootNotesTab
            v-model:search="noteSearch"
            v-model:filter="noteFilter"
            :pinned="pinnedNotes"
            :others="otherNotes"
            :loading="notesLoading"
            :total="allNotes.length"
            @create="openForm()"
            @edit="openForm"
            @pin="pin"
            @remove="remove"
          />
        </TabsContent>
      </TabsRoot>
    </template>
  </div>
</template>
