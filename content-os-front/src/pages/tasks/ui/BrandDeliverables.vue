<script setup lang="ts">
import { TabsIndicator, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { computed } from 'vue'
import { VPagination } from '@/shared/ui/pagination'
import { VSearch } from '@/shared/ui/search'
import { VSelect } from '@/shared/ui/select'
import { brandDeliverablesShowing } from '../model/brand-deliverable'
import {
  BRAND_DELIVERABLES_PER_PAGE,
  useBrandDeliverablesList,
} from '../model/brand-deliverables-list'
import { taskSortOptions } from '../model/task'
import BrandDeliverableCard from './BrandDeliverableCard.vue'
import BrandDeliverablesTable from './BrandDeliverablesTable.vue'

const {
  search,
  tab,
  tabs,
  sort,
  product,
  brand,
  productOptions,
  brandOptions,
  deliverables,
  total,
  loading,
  page,
} = useBrandDeliverablesList()

const showing = computed(() => brandDeliverablesShowing(deliverables.value.length, total.value))
</script>

<!--
  Brand deliverables (docs/adr/0019): the art director's backlog of what brands
  assigned to them. No Figma frame yet: built from the shoot tasks' parts —
  "Task filters", "Card / Task table" and the mobile task card.
  TODO(ui): mobile filters sheet (Figma "CMS / Mobile / Filter button").
-->
<template>
  <section
    aria-label="Search and filters"
    class="hidden flex-col gap-3 rounded-2xl bg-card p-3 md:flex"
  >
    <TabsRoot v-model="tab" activation-mode="automatic">
      <TabsList
        aria-label="Deliverable status"
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
        placeholder="Search deliverables, products, or brands…"
        aria-label="Search deliverables"
        class="min-w-0 flex-1"
      />
      <VSelect
        v-model="product"
        :options="productOptions"
        variant="filter"
        aria-label="Product"
        searchable
        search-placeholder="Search products…"
        class="w-[160px]"
      />
      <VSelect
        v-model="brand"
        :options="brandOptions"
        variant="filter"
        aria-label="Brand"
        searchable
        search-placeholder="Search brands…"
        class="w-[148px]"
      />
      <VSelect
        v-model="sort"
        :options="taskSortOptions"
        variant="filter"
        prefix="Sort by:"
        aria-label="Sort"
        class="w-[174px]"
      />
    </div>
  </section>

  <section
    aria-label="Search and statuses"
    class="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-[0_8px_32px_4px_rgb(29_42_60/0.05)] md:hidden"
  >
    <VSearch
      v-model="search"
      placeholder="Search deliverables, products, or brands…"
      aria-label="Search deliverables"
    />
    <TabsRoot v-model="tab" activation-mode="automatic">
      <TabsList aria-label="Deliverable status" class="scrollbar-none flex gap-1 overflow-x-auto">
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

  <p v-if="loading" class="py-10 text-center text-p2 font-medium text-secondary">Loading…</p>

  <template v-else>
    <section
      aria-label="Brand deliverables"
      class="hidden flex-col rounded-2xl bg-card px-5 pt-5 md:flex"
    >
      <BrandDeliverablesTable v-if="deliverables.length" :deliverables="deliverables" />
      <p v-else class="py-10 text-center text-p2 font-medium text-secondary">
        No deliverables here.
      </p>
      <footer class="flex min-h-16 items-center justify-between gap-4 border-t border-subtle py-3">
        <p class="text-p3 font-medium text-secondary">{{ showing }}</p>
        <VPagination
          v-model:page="page"
          :total="total"
          :items-per-page="BRAND_DELIVERABLES_PER_PAGE"
        />
      </footer>
    </section>

    <div class="flex flex-col gap-4 md:hidden">
      <p
        class="flex h-10 items-center justify-between rounded-2xl bg-card px-3.5 text-p3 font-medium text-secondary shadow-[0_8px_32px_4px_rgb(29_42_60/0.05)]"
      >
        <span>Deliverable</span>
        <span>{{ showing }}</span>
      </p>
      <ul v-if="deliverables.length" class="flex flex-col gap-4">
        <li v-for="item in deliverables" :key="item.id">
          <BrandDeliverableCard :deliverable="item" />
        </li>
      </ul>
      <p v-else class="rounded-2xl bg-card p-8 text-center text-p2 font-medium text-secondary">
        No deliverables here.
      </p>
      <VPagination
        v-if="total > BRAND_DELIVERABLES_PER_PAGE"
        v-model:page="page"
        :total="total"
        :items-per-page="BRAND_DELIVERABLES_PER_PAGE"
        class="self-center"
      />
    </div>
  </template>
</template>
