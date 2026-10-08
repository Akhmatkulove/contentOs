<script setup lang="ts">
import { TabsIndicator, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VNotificationButton } from '@/shared/ui/notification-button'
import { VPagination } from '@/shared/ui/pagination'
import { VSearch } from '@/shared/ui/search'
import { VSelect } from '@/shared/ui/select'
import { dateFilterOptions, sortOptions, statusFilterOptions } from '../model/shoot-filters'
import { SHOOTS_PER_PAGE, useShootsList } from '../model/shoots-list'
import NextShootCard from './NextShootCard.vue'
import ShootCard from './ShootCard.vue'
import ShootOverviewCard from './ShootOverviewCard.vue'

const { search, status, date, sort, tab, tabs, shoots, total, loading, page, canCreate } =
  useShootsList()
</script>

<!--
  Figma "SCREEN:s_list Shoots" and "MSCREEN:s_list Shoots". From xl the list
  and a column of cards side by side; below it the cards follow the list.
  TODO(api): Recent activity card — there is no activity log yet.
-->
<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <!-- Figma "Topbar" (desktop) and the header of "CMS / Mobile / Topbar". -->
    <header class="flex items-center justify-between gap-4 md:min-h-16">
      <div class="flex min-w-0 flex-col gap-1 md:gap-1.5">
        <h1 class="text-h6 text-brand md:text-h3">Shoots</h1>
        <p class="text-p3 font-medium text-secondary md:hidden">Plan shoots and track your team.</p>
        <p class="hidden text-p2 font-medium text-secondary md:block">
          Plan, track, and manage all content shoots.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <VButton v-if="canCreate" as-child class="hidden md:inline-flex">
          <RouterLink :to="{ name: 'shoot-create' }">
            <VIcon name="plus-sign" />
            New shoot
          </RouterLink>
        </VButton>
        <!-- TODO(ui): mobile topbar in AppLayout (Figma "CMS / Mobile / Topbar"); move the bell there. -->
        <VNotificationButton unread class="lg:hidden" />
      </div>
    </header>

    <!-- Figma "Toolbar" (desktop). -->
    <section
      aria-label="Search and filters"
      class="hidden items-center gap-2.5 rounded-2xl bg-card p-3 md:flex"
    >
      <VSearch
        v-model="search"
        placeholder="Search shoots by name, location, or product…"
        aria-label="Search shoots"
        class="min-w-0 flex-1"
      />
      <VSelect
        v-model="status"
        :options="statusFilterOptions"
        variant="filter"
        placeholder="Status"
        aria-label="Status"
        class="w-[136px]"
      />
      <VSelect
        v-model="date"
        :options="dateFilterOptions"
        variant="filter"
        placeholder="Date"
        aria-label="Date"
        class="w-[136px]"
      />
      <VSelect
        v-model="sort"
        :options="sortOptions"
        variant="filter"
        placeholder="Sort by"
        aria-label="Sort"
        class="w-[144px]"
      />
    </section>

    <!-- Figma "Card / Today's schedule" (mobile): search and the status chips.
         TODO(ui): mobile filters sheet (Figma "CMS / Mobile / Filter button"). -->
    <section
      aria-label="Search and statuses"
      class="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-[0_8px_32px_4px_rgb(29_42_60/0.05)] md:hidden"
    >
      <VSearch v-model="search" placeholder="Search shoots…" aria-label="Search shoots" />
      <TabsRoot v-model="tab" activation-mode="automatic">
        <TabsList aria-label="Shoot status" class="scrollbar-none flex gap-1 overflow-x-auto">
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

    <!-- Figma "btn / New shoot" (mobile). -->
    <VButton v-if="canCreate" as-child class="w-full md:hidden">
      <RouterLink :to="{ name: 'shoot-create' }">
        <VIcon name="plus-sign" />
        New shoot
      </RouterLink>
    </VButton>

    <div class="grid grid-cols-1 gap-4 md:gap-5 xl:grid-cols-[minmax(0,1fr)_316px] xl:items-start">
      <div class="flex min-w-0 flex-col gap-3">
        <!-- Figma "Shoot status tabs" (desktop): one underline slides between them. -->
        <TabsRoot v-model="tab" activation-mode="automatic" class="hidden md:block">
          <TabsList aria-label="Shoot status" class="relative flex gap-5">
            <TabsTrigger
              v-for="item in tabs"
              :key="item.value"
              :value="item.value"
              class="p-2.5 text-p2 font-medium whitespace-nowrap text-secondary transition-colors outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-inset data-[state=active]:text-link"
            >
              {{ item.label }} ({{ item.count }})
            </TabsTrigger>
            <TabsIndicator
              class="absolute bottom-0 left-0 h-0.5 w-(--reka-tabs-indicator-size) translate-x-(--reka-tabs-indicator-position) bg-violet-400 transition-[width,translate] duration-200 motion-reduce:transition-none"
            />
          </TabsList>
        </TabsRoot>

        <p v-if="loading" class="py-10 text-center text-p2 font-medium text-secondary">Loading…</p>
        <!-- TODO(ui): empty and "nothing found" states — not in Figma yet. -->
        <p
          v-else-if="!shoots.length"
          class="rounded-2xl bg-card p-8 text-center text-p2 font-medium text-secondary"
        >
          No shoots here yet.
        </p>
        <!-- On xl each card is a row that scrolls sideways inside itself when the
             column is too narrow for it (ShootCard). -->
        <ul v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-3 xl:grid-cols-1">
          <li v-for="shoot in shoots" :key="shoot.id">
            <ShootCard :shoot="shoot" />
          </li>
        </ul>

        <VPagination
          v-if="total > SHOOTS_PER_PAGE"
          v-model:page="page"
          :total="total"
          :items-per-page="SHOOTS_PER_PAGE"
          class="self-center"
        />
      </div>

      <aside
        aria-label="Shoot summary"
        class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-1"
      >
        <NextShootCard />
        <ShootOverviewCard />
      </aside>
    </div>
  </div>
</template>
