<script setup lang="ts">
import { ReferenceCard } from '@/entities/reference'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VPagination } from '@/shared/ui/pagination'
import { VSearch } from '@/shared/ui/search'
import { VSelect } from '@/shared/ui/select'
import { sortOptions, typeOptions, type ReferenceFilters } from '../model/reference-filters'
import { REFERENCES_PER_PAGE, useReferencesList } from '../model/references-list'

const {
  search,
  filters,
  options,
  references,
  total,
  loading,
  page,
  filtered,
  searchPlaceholder,
  filtersActive,
  openFilters,
} = useReferencesList()

function setSort(value: string | undefined) {
  if (value) filters.sort = value as ReferenceFilters['sort']
}
</script>

<!--
  Figma "References" (desktop) and its mobile screen.
  TODO(ui): tabs My references, Recent, Favorites, Collections; Add reference and
  the "…" menu — no data for them yet (own references, favorites, collections).
-->
<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <!-- Below lg the app topbar carries the title. -->
    <header class="hidden min-h-16 flex-col justify-center gap-1.5 lg:flex">
      <h1 class="text-h3 text-brand">References</h1>
      <p class="text-p2 font-medium text-secondary">
        A shared library of visual references for shoots, products, and creators. Save, organize,
        and reuse inspiration.
      </p>
    </header>

    <!-- Only one tab for now. Mobile: Figma "CMS / Mobile / Tab" (equal-width,
         underlined); desktop: the tab bar of the references page. -->
    <div role="tablist" aria-label="References" class="flex">
      <span
        role="tab"
        aria-selected="true"
        class="flex flex-1 items-center justify-center border-b-2 border-violet-500 px-1 py-2 text-p2 font-medium text-primary md:flex-none md:border-violet-400 md:p-2.5 md:text-link"
      >
        All references ({{ total }})
      </span>
    </div>

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

    <p v-if="loading" class="py-10 text-center text-p2 font-medium text-secondary">Loading…</p>

    <template v-else-if="references.length">
      <!-- Desktop: Figma card width (≈230px) per column, so one card doesn't stretch. -->
      <ul
        class="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] md:gap-x-5 md:gap-y-6"
      >
        <li v-for="reference in references" :key="reference.id">
          <ReferenceCard :reference="reference" />
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
    <p v-else-if="filtered" class="py-10 text-center text-p2 font-medium text-secondary">
      No references match your search or filters.
    </p>
    <p v-else class="py-10 text-center text-p2 font-medium text-secondary">
      References show up here once a brand assigns you a deliverable.
    </p>
  </div>
</template>
