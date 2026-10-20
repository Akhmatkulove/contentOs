<script setup lang="ts">
import { TabsIndicator, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { useTemplateRef } from 'vue'
import { useActiveTabInView } from '@/shared/lib'
import { VButton } from '@/shared/ui/button'
import { VClearFilters } from '@/shared/ui/clear-filters'
import { VIcon } from '@/shared/ui/icon'
import { VPagination } from '@/shared/ui/pagination'
import { VSearch } from '@/shared/ui/search'
import { VSelect } from '@/shared/ui/select'
import { NotificationBell } from '@/widgets/notification-bell'
import {
  foundLabel,
  sortOptions,
  statusOptions,
  type ContentFilters,
} from '../model/content-filters'
import { CONTENT_PER_PAGE, useContentList } from '../model/content-list'
import ContentCard from './ContentCard.vue'
import ContentCardSkeleton from './ContentCardSkeleton.vue'

const {
  scope,
  tabs,
  search,
  filters,
  options,
  showShoots,
  items,
  total,
  loading,
  refreshing,
  page,
  filtered,
  searchPlaceholder,
  filtersActive,
  openFilters,
  activeFilters,
  clearFilters,
} = useContentList()
useActiveTabInView(useTemplateRef('tabList'), scope)

function setSort(value: string | undefined) {
  if (value) filters.sort = value as ContentFilters['sort']
}
</script>

<!--
  Figma "SCREEN:c_list Content" (desktop); mobile follows the references page.
  Not in this iteration: the "…" menu, tabs Recent, Favorites and Trash, the
  All media filter.
  TODO(api): storage used ("12.4 GB of 100 GB used") — no endpoint yet.
-->
<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <!-- Below lg the app topbar carries the title. -->
    <header class="hidden min-h-16 items-center justify-between gap-4 lg:flex">
      <div class="flex min-w-0 flex-col gap-1.5">
        <h1 class="text-h3 text-brand">Content</h1>
        <p class="text-p2 font-medium text-secondary">
          All approved and in-progress content from your shoots. Find, download or share.
        </p>
      </div>
      <!-- Below lg the bell sits in the app topbar. -->
      <NotificationBell class="shrink-0" />
    </header>

    <!-- Mobile: equal-width underlined tabs; desktop: the tab bar of Figma. The tabs
         only switch the list below, so there are no panels. -->
    <TabsRoot v-model="scope" activation-mode="automatic">
      <TabsList
        ref="tabList"
        aria-label="Content"
        class="scrollbar-none relative flex overflow-x-auto"
      >
        <TabsTrigger
          v-for="tab in tabs"
          :key="tab.value"
          :value="tab.value"
          class="flex flex-1 items-center justify-center px-1 py-2 text-p2 font-medium whitespace-nowrap text-secondary transition-colors outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-inset data-[state=active]:text-primary md:flex-none md:p-2.5 md:data-[state=active]:text-link"
        >
          {{ tab.label }} ({{ tab.count }})
        </TabsTrigger>
        <TabsIndicator
          class="absolute bottom-0 left-0 h-0.5 w-(--reka-tabs-indicator-size) translate-x-(--reka-tabs-indicator-position) bg-violet-500 transition-[width,translate] duration-200 motion-reduce:transition-none md:bg-violet-400"
        />
      </TabsList>
    </TabsRoot>

    <section
      aria-label="Search and filters"
      class="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-[0_8px_32px_4px_rgb(29_42_60/0.05)] md:gap-2.5 md:p-3 md:shadow-none"
    >
      <VSearch
        v-model="search"
        :placeholder="searchPlaceholder"
        aria-label="Search content"
        class="min-w-0 flex-1 md:max-w-[388px] md:bg-subtle"
      />
      <VButton
        variant="secondary"
        size="icon-32"
        aria-label="Filters"
        :aria-pressed="filtersActive"
        :class="['md:hidden', filtersActive && 'border-violet-400 bg-status-accent']"
        @click="openFilters"
      >
        <VIcon name="filter-horizontal" :size="16" />
      </VButton>

      <div class="hidden items-center gap-2.5 md:flex">
        <VSelect
          v-model="filters.productId"
          :options="options.products"
          variant="filter"
          aria-label="Product"
          searchable
          class="w-[118px]"
        />
        <VSelect
          v-if="showShoots"
          v-model="filters.shootId"
          :options="options.shoots"
          variant="filter"
          aria-label="Shoot"
          searchable
          class="w-[118px]"
        />
        <VSelect
          v-model="filters.authorId"
          :options="options.creators"
          variant="filter"
          aria-label="Creator"
          searchable
          class="w-[118px]"
        />
        <VSelect
          v-model="filters.status"
          :options="statusOptions"
          variant="filter"
          aria-label="Status"
          class="w-[118px]"
        />
        <VSelect
          :model-value="filters.sort"
          :options="sortOptions"
          variant="filter"
          icon="arrow-up-down-sharp"
          aria-label="Sort"
          class="w-[164px]"
          @update:model-value="setSort"
        />
      </div>
    </section>

    <!-- Only while something narrows the list: how much is left and the way back. -->
    <div v-if="activeFilters && !loading" class="flex items-center gap-3">
      <p class="text-p2 font-medium text-secondary">{{ foundLabel(total) }}</p>
      <VClearFilters :count="activeFilters" @clear="clearFilters" />
    </div>

    <!-- First load: placeholders in the layout the cards will take. -->
    <div
      v-if="loading"
      aria-busy="true"
      class="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] md:gap-x-5 md:gap-y-6"
    >
      <span class="sr-only">Loading…</span>
      <ContentCardSkeleton v-for="n in CONTENT_PER_PAGE" :key="n" />
    </div>

    <template v-else-if="items.length">
      <!-- Desktop: Figma card width (≈230px) per column, so one card doesn't stretch.
           Old cards stay dimmed while the next page or filter loads. -->
      <ul
        :aria-busy="refreshing"
        :class="[
          'grid grid-cols-2 gap-3 transition-opacity duration-200 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] md:gap-x-5 md:gap-y-6',
          refreshing && 'pointer-events-none opacity-60',
        ]"
      >
        <li v-for="item in items" :key="item.id">
          <ContentCard :item="item" />
        </li>
      </ul>
      <VPagination
        v-if="total > CONTENT_PER_PAGE"
        v-model:page="page"
        :total="total"
        :items-per-page="CONTENT_PER_PAGE"
        class="self-center md:self-end"
      />
    </template>

    <!-- TODO(ui): empty and "nothing found" states — not in Figma yet. -->
    <div v-else-if="filtered" class="flex flex-col items-center gap-3 py-10">
      <p class="text-center text-p2 font-medium text-secondary">
        No content matches your search or filters.
      </p>
      <VClearFilters :count="activeFilters" @clear="clearFilters" />
    </div>
    <div v-else-if="scope === 'favorites'" class="flex flex-col items-center gap-3 py-10">
      <span class="flex size-11 items-center justify-center rounded-full bg-card text-secondary">
        <VIcon name="star" :size="18" />
      </span>
      <p class="max-w-72 text-center text-p2 font-medium text-secondary">
        No favorites yet. Star content on its page to keep it here.
      </p>
    </div>
    <p v-else class="py-10 text-center text-p2 font-medium text-secondary">
      Approved files show up here once the art director sends them to the brand.
    </p>
  </div>
</template>
