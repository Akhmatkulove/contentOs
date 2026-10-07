<script setup lang="ts">
import { TabsIndicator, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { useTemplateRef } from 'vue'
import {
  ReferenceCard,
  sortOptions,
  typeOptions,
  type ReferenceFilters,
} from '@/entities/reference'
import { useActiveTabInView } from '@/shared/lib'
import { VButton } from '@/shared/ui/button'
import { VClearFilters } from '@/shared/ui/clear-filters'
import { VIcon } from '@/shared/ui/icon'
import { VPagination } from '@/shared/ui/pagination'
import { VSearch } from '@/shared/ui/search'
import { VSelect } from '@/shared/ui/select'
import { useAddReference } from '../model/add-reference'
import { foundLabel } from '../model/reference-filters'
import { REFERENCES_PER_PAGE, useReferencesList } from '../model/references-list'

const {
  scope,
  tabs,
  search,
  filters,
  options,
  references,
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
  toggleFavorite,
} = useReferencesList()
const { addReference } = useAddReference()
useActiveTabInView(useTemplateRef('tabList'), scope)

function setSort(value: string | undefined) {
  if (value) filters.sort = value as ReferenceFilters['sort']
}
</script>

<!--
  Figma "References" (desktop) and its mobile screen.
  TODO(ui): tabs Recent, Collections and the "…" menu — no data
  for them yet (collections).
-->
<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <!-- Below lg the app topbar carries the title. -->
    <header class="hidden min-h-16 items-center justify-between gap-4 lg:flex">
      <div class="flex min-w-0 flex-col gap-1.5">
        <h1 class="text-h3 text-brand">References</h1>
        <p class="text-p2 font-medium text-secondary">
          A shared library of visual references for shoots, products, and creators. Save, organize,
          and reuse inspiration.
        </p>
      </div>
      <VButton class="shrink-0" @click="addReference">
        <VIcon name="plus-sign" />
        Add reference
      </VButton>
    </header>

    <!-- Mobile: Figma "CMS / Mobile / Tab" (equal-width, underlined); desktop: the
         tab bar of the references page. The tabs only switch the list below, so
         there are no panels: Reka gives roving focus, arrows and aria-selected.
         Tabs that don't fit scroll sideways. -->
    <TabsRoot v-model="scope" activation-mode="automatic">
      <TabsList
        ref="tabList"
        aria-label="References"
        class="scrollbar-none relative flex overflow-x-auto"
      >
        <TabsTrigger
          v-for="tab in tabs"
          :key="tab.value"
          :value="tab.value"
          class="flex flex-1 items-center justify-center px-1 py-2 text-p2 font-medium whitespace-nowrap text-secondary transition-colors outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-inset data-[state=active]:text-primary md:flex-none md:p-2.5"
        >
          {{ tab.label }} ({{ tab.count }})
        </TabsTrigger>
        <!-- One underline slides between the tabs (Reka sizes it to the active one). -->
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
        aria-label="Search references"
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
          v-model="filters.type"
          :options="typeOptions"
          variant="filter"
          aria-label="Type"
          class="w-[118px]"
        />
        <VSelect
          v-model="filters.productId"
          :options="options.products"
          variant="filter"
          aria-label="Product"
          searchable
          class="w-[118px]"
        />
        <!-- TODO(ui): All shoots filter — shoots don't exist yet. -->
        <VSelect
          v-model="filters.authorId"
          :options="options.creators"
          variant="filter"
          aria-label="Creator"
          searchable
          class="w-[118px]"
        />
        <VSelect
          v-model="filters.tag"
          :options="options.tags"
          variant="filter"
          aria-label="Tag"
          searchable
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

    <!-- Figma "Button / ＋ Add reference" on the mobile screen: full width under
         the search card. On desktop the button sits in the header instead. -->
    <VButton class="h-10.5 w-full gap-1.5 px-5 lg:hidden" @click="addReference">
      <VIcon name="plus-sign" />
      Add reference
    </VButton>

    <!-- Only while something narrows the list: how much is left and the way back. -->
    <div v-if="activeFilters && !loading" class="flex items-center gap-3">
      <p class="text-p2 font-medium text-secondary">{{ foundLabel(total) }}</p>
      <VClearFilters :count="activeFilters" @clear="clearFilters" />
    </div>

    <p v-if="loading" class="py-10 text-center text-p2 font-medium text-secondary">Loading…</p>

    <template v-else-if="references.length">
      <!-- Desktop: Figma card width (≈230px) per column, so one card doesn't stretch.
           Old cards stay dimmed while the next page or filter loads. -->
      <ul
        :aria-busy="refreshing"
        :class="[
          'grid grid-cols-2 gap-3 transition-opacity duration-200 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] md:gap-x-5 md:gap-y-6',
          refreshing && 'pointer-events-none opacity-60',
        ]"
      >
        <li v-for="reference in references" :key="reference.id">
          <ReferenceCard :reference="reference" @toggle-favorite="toggleFavorite(reference)" />
        </li>
      </ul>
      <VPagination
        v-if="total > REFERENCES_PER_PAGE"
        v-model:page="page"
        :total="total"
        :items-per-page="REFERENCES_PER_PAGE"
        class="self-center md:self-end"
      />
    </template>

    <!-- TODO(ui): empty and "nothing found" states — not in Figma yet. -->
    <div v-else-if="filtered" class="flex flex-col items-center gap-3 py-10">
      <p class="text-center text-p2 font-medium text-secondary">
        No references match your search or filters.
      </p>
      <VClearFilters :count="activeFilters" @clear="clearFilters" />
    </div>
    <p v-else-if="scope === 'mine'" class="py-10 text-center text-p2 font-medium text-secondary">
      References you add show up here.
    </p>
    <p
      v-else-if="scope === 'favorites'"
      class="py-10 text-center text-p2 font-medium text-secondary"
    >
      Star a reference to keep it here.
    </p>
    <p v-else class="py-10 text-center text-p2 font-medium text-secondary">
      References show up here once a brand assigns you a deliverable.
    </p>
  </div>
</template>
