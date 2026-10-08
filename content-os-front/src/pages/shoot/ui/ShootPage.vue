<script setup lang="ts">
import { TabsContent, TabsIndicator, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { useTemplateRef } from 'vue'
import { useActiveTabInView } from '@/shared/lib'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VStatus } from '@/shared/ui/status'
import { useShootPage } from '../model/shoot-page'
import ShootOverview from './ShootOverview.vue'
import ShootProductsTab from './ShootProductsTab.vue'
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
  status,
  facts,
  products,
  tasks,
  people,
  counts,
  covers,
  productSearch,
  productSort,
  foundProducts,
  taskFilters,
  foundTasks,
  taskOptions,
} = useShootPage(() => id)
useActiveTabInView(useTemplateRef('tabList'), tab)

const editRoute = { name: 'shoot-edit', params: { id } }
</script>

<!--
  Figma "Shoot / Overview", "Shoot / Products", "Shoot / Tasks" (desktop and
  mobile). Edit is the author's (the art director who created the shoot).
  TODO(ui): tabs Needs review, Approved, References, Files, Team, Notes and the
  "…" menu — come later.
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
      </TabsRoot>
    </template>
  </div>
</template>
