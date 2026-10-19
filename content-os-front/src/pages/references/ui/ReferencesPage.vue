<script setup lang="ts">
import { TabsIndicator, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { computed, useTemplateRef } from 'vue'
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
import { NotificationBell } from '@/widgets/notification-bell'
import { useAddReference } from '../model/add-reference'
import { foundLabel } from '../model/reference-filters'
import {
  COLLECTIONS_PER_PAGE,
  REFERENCES_PER_PAGE,
  useReferencesList,
} from '../model/references-list'
import CollectionRow from './CollectionRow.vue'
import CollectionRowSkeleton from './CollectionRowSkeleton.vue'
import ReferenceCardSkeleton from './ReferenceCardSkeleton.vue'

const {
  scope,
  tabs,
  search,
  filters,
  options,
  grouped,
  collection,
  openCollection,
  closeCollection,
  references,
  collections,
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
  canRemove,
  removeReference,
} = useReferencesList()
const { addReference } = useAddReference()
useActiveTabInView(useTemplateRef('tabList'), scope)

// Pages count references, or collections on the Collections tab.
const perPage = computed(() => (grouped.value ? COLLECTIONS_PER_PAGE : REFERENCES_PER_PAGE))

function setSort(value: string | undefined) {
  if (value) filters.sort = value as ReferenceFilters['sort']
}
</script>

<!--
  Figma "References" (desktop) and its mobile screen.
  TODO(ui): tab Recent and the "…" menu — no data for them yet.
  The Collections tab isn't in Figma: a row per collection, built from the same
  cards, buttons and type as the rest of the page.
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
      <div class="flex shrink-0 items-center gap-3">
        <VButton @click="addReference">
          <VIcon name="plus-sign" />
          Add reference
        </VButton>
        <!-- Below lg the bell sits in the app topbar. -->
        <NotificationBell />
      </div>
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
        <!-- TODO(api): All shoots filter — GET /references doesn't filter by shoot. -->
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

    <!-- An opened collection: its name and the way back to all of them. -->
    <!-- min-h-9: as tall as a collection's header on the tab, so the cards stay put. -->
    <div v-if="collection" class="flex min-h-9 min-w-0 items-center gap-3">
      <VButton
        variant="secondary"
        size="icon-32"
        aria-label="All collections"
        @click="closeCollection"
      >
        <VIcon name="arrow-left-01-sharp" :size="16" />
      </VButton>
      <h2 class="flex min-w-0 items-baseline gap-2">
        <span class="truncate text-h6 text-primary">{{ collection }}</span>
        <!-- Hidden while another tab's cards stand in. -->
        <span v-if="!loading && !refreshing" class="shrink-0 text-p2 font-medium text-tertiary">
          {{ total }}<span class="sr-only"> {{ total === 1 ? 'reference' : 'references' }}</span>
        </span>
      </h2>
    </div>

    <!-- Only while something narrows the list: how much is left and the way back. -->
    <div v-if="activeFilters && !loading" class="flex items-center gap-3">
      <p class="text-p2 font-medium text-secondary">
        {{ foundLabel(total, grouped ? 'collection' : 'reference') }}
      </p>
      <VClearFilters :count="activeFilters" @clear="clearFilters" />
    </div>

    <!-- First load: placeholders in the layout the cards will take. -->
    <div v-if="loading" aria-busy="true" class="flex flex-col gap-8 md:gap-10">
      <span class="sr-only">Loading…</span>
      <template v-if="grouped">
        <CollectionRowSkeleton v-for="n in 3" :key="n" />
      </template>
      <div
        v-else
        class="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] md:gap-x-5 md:gap-y-6"
      >
        <ReferenceCardSkeleton v-for="n in REFERENCES_PER_PAGE" :key="n" />
      </div>
    </div>

    <template v-else-if="grouped ? collections.length : references.length">
      <!-- Old cards stay dimmed while the next page or filter loads. -->
      <div
        v-if="grouped"
        :aria-busy="refreshing"
        :class="[
          'flex flex-col gap-8 transition-opacity duration-200 md:gap-10',
          refreshing && 'pointer-events-none opacity-60',
        ]"
      >
        <CollectionRow
          v-for="group in collections"
          :key="group.name"
          :name="group.name"
          :total="group.total"
          :references="group.references"
          :can-remove="canRemove"
          @open="openCollection(group.name)"
          @toggle-favorite="toggleFavorite"
          @remove="removeReference"
        />
      </div>
      <!-- Desktop: Figma card width (≈230px) per column, so one card doesn't stretch. -->
      <ul
        v-else
        :aria-busy="refreshing"
        :class="[
          'grid grid-cols-2 gap-3 transition-opacity duration-200 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] md:gap-x-5 md:gap-y-6',
          refreshing && 'pointer-events-none opacity-60',
        ]"
      >
        <li v-for="reference in references" :key="reference.id">
          <ReferenceCard
            :reference="reference"
            :to="{ name: 'reference', params: { id: reference.id } }"
            :removable="canRemove(reference.id)"
            @toggle-favorite="toggleFavorite(reference)"
            @remove="removeReference(reference)"
          />
        </li>
      </ul>
      <VPagination
        v-if="total > perPage"
        v-model:page="page"
        :total="total"
        :items-per-page="perPage"
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
    <p v-else-if="collection" class="py-10 text-center text-p2 font-medium text-secondary">
      This collection has no references yet.
    </p>
    <p v-else-if="grouped" class="py-10 text-center text-p2 font-medium text-secondary">
      Pick a collection when you add a reference, and it shows up here.
    </p>
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
