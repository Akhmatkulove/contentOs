<script setup lang="ts">
import { VButton } from '@/shared/ui/button'
import { VClearFilters } from '@/shared/ui/clear-filters'
import { VIcon } from '@/shared/ui/icon'
import { NotificationBell } from '@/widgets/notification-bell'
import { VPagination } from '@/shared/ui/pagination'
import { VSearch } from '@/shared/ui/search'
import { VSelect } from '@/shared/ui/select'
import { productsLabel } from '../model/product'
import { sortOptions, statusFilterOptions } from '../model/product-filters'
import { PRODUCTS_PER_PAGE, useProductsList } from '../model/products-list'
import ProductCard from './ProductCard.vue'
import ProductsEmpty from './ProductsEmpty.vue'

const {
  products,
  total,
  isEmpty,
  loading,
  search,
  filters,
  collections,
  setCollection,
  setStatus,
  setSort,
  filtersActive,
  openFilters,
  activeFilters,
  clearFilters,
  page,
  canCreate,
} = useProductsList()
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <header class="mb-5 flex items-center justify-between gap-4 md:mb-0 md:min-h-16">
      <div class="flex min-w-0 flex-col gap-1 md:gap-1.5">
        <h1 class="text-h6 text-brand md:text-h3">Products</h1>
        <p class="text-p3 font-medium text-secondary md:text-p2">All products in your workspace</p>
      </div>

      <div class="flex items-center gap-3">
        <VButton v-if="canCreate && !isEmpty && !loading" as-child class="hidden md:inline-flex">
          <RouterLink :to="{ name: 'product-create' }">
            <VIcon name="plus-sign" />
            Add product
          </RouterLink>
        </VButton>
        <!-- TODO(ui): mobile topbar in AppLayout (Figma "CMS / Mobile / Topbar"); move the bell there. -->
        <NotificationBell />
      </div>
    </header>

    <p v-if="loading" class="py-10 text-center text-p2 font-medium text-secondary">Loading…</p>

    <ProductsEmpty v-else-if="isEmpty" :can-create="canCreate" />

    <template v-else>
      <section
        aria-label="Search and filters"
        class="flex flex-wrap items-center gap-3 rounded-2xl bg-card p-4 shadow-[0_8px_32px_4px_rgb(29_42_60/0.05)] md:p-3 md:shadow-none"
      >
        <VSearch
          v-model="search"
          placeholder="Search products…"
          aria-label="Search products"
          class="w-auto min-w-0 flex-1 md:min-w-60"
        />
        <!-- Figma "CMS / Mobile / Filter button": active once something is filtered. -->
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
        <!-- Figma "Field / Collection: All collections" and the rest: desktop only. -->
        <div class="hidden items-center gap-3 md:flex">
          <VSelect
            :model-value="filters.collection"
            @update:model-value="setCollection"
            :options="collections"
            variant="filter"
            prefix="Collection:"
            aria-label="Collection"
            searchable
            search-placeholder="Search collections…"
            class="w-[232px]"
          />
          <VSelect
            :model-value="filters.status"
            @update:model-value="setStatus"
            :options="statusFilterOptions"
            variant="filter"
            prefix="Status:"
            aria-label="Status"
            class="w-[220px]"
          />
          <VSelect
            :model-value="filters.sort"
            :options="sortOptions"
            variant="filter"
            prefix="Sort by:"
            aria-label="Sort"
            class="w-[208px]"
            @update:model-value="setSort"
          />
        </div>
      </section>

      <VButton v-if="canCreate" as-child class="w-full md:hidden">
        <RouterLink :to="{ name: 'product-create' }">
          <VIcon name="plus-sign" />
          Add product
        </RouterLink>
      </VButton>

      <div class="flex items-center justify-between md:min-h-11">
        <div class="flex min-w-0 items-center gap-3">
          <p class="text-p2 font-medium text-secondary">{{ productsLabel(total) }}</p>
          <VClearFilters v-if="activeFilters" :count="activeFilters" @clear="clearFilters" />
        </div>
        <!-- TODO(ui): list view of products — the toggle does nothing yet. -->
        <div role="group" aria-label="View" class="flex items-center gap-1.5">
          <VButton
            variant="ghost"
            size="icon-36"
            aria-label="Grid"
            aria-pressed="true"
            class="rounded-lg"
          >
            <VIcon name="grid-view" :size="20" />
          </VButton>
          <VButton
            variant="ghost"
            size="icon-36"
            aria-label="List"
            aria-pressed="false"
            class="rounded-lg"
          >
            <VIcon name="list-view" :size="20" />
          </VButton>
        </div>
      </div>

      <div
        v-if="products.length"
        class="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 xl:grid-cols-4"
      >
        <ProductCard
          v-for="product in products"
          :key="product.id"
          :product="product"
          :can-edit="canCreate"
        />
      </div>
      <!-- TODO(ui): "nothing found" state — not in Figma yet. -->
      <div v-else class="flex flex-col items-center gap-3 py-10">
        <p class="text-center text-p2 font-medium text-secondary">
          No products match your search or filters.
        </p>
        <VClearFilters v-if="activeFilters" :count="activeFilters" @clear="clearFilters" />
      </div>

      <div class="flex flex-col items-center gap-3 md:flex-row md:justify-between">
        <p class="text-p3 font-medium text-secondary">
          Showing {{ products.length }} of {{ productsLabel(total) }}
        </p>
        <VPagination v-model:page="page" :total="total" :items-per-page="PRODUCTS_PER_PAGE" />
      </div>
    </template>
  </div>
</template>
