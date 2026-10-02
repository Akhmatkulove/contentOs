<script setup lang="ts">
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VPagination } from '@/shared/ui/pagination'
import { VSearch } from '@/shared/ui/search'
import { PRODUCTS_PER_PAGE, useProductsList } from '../model/products-list'
import ProductCard from './ProductCard.vue'
import ProductsEmpty from './ProductsEmpty.vue'

const { products, total, isEmpty, search, page } = useProductsList()

// Static triggers until the dropdown component exists.
const filters = [
  { label: 'Collection: All collections', class: 'w-[232px]' },
  { label: 'Status: All statuses', class: 'w-[220px]' },
  { label: 'Sort by: Newest first', class: 'w-[208px]' },
]
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <header class="mb-5 flex items-center justify-between gap-4 md:mb-0 md:min-h-16">
      <div class="flex min-w-0 flex-col gap-1 md:gap-1.5">
        <h1 class="text-h6 text-brand md:text-h3">Products</h1>
        <p class="text-p3 font-medium text-secondary md:text-p2">All products in your workspace</p>
      </div>

      <div class="flex items-center gap-3">
        <VButton v-if="!isEmpty" class="hidden md:inline-flex">
          <VIcon name="plus-sign" :size="16" />
          Add product
        </VButton>
        <VButton
          variant="surface"
          size="icon-44"
          aria-label="Notifications"
          class="relative text-link shadow-[0_8px_16px_rgb(29_42_60/0.05)] lg:hidden"
        >
          <VIcon name="notification-02" :size="18" />
          <span
            class="absolute top-[11px] right-[11px] size-[7px] rounded-full bg-red-300 ring-1 ring-white"
          />
        </VButton>
      </div>
    </header>

    <ProductsEmpty v-if="isEmpty" />

    <template v-else>
      <section
        aria-label="Filters"
        class="flex flex-wrap items-center gap-3 rounded-2xl bg-card p-4 shadow-[0_8px_32px_4px_rgb(29_42_60/0.05)] md:p-3 md:shadow-none"
      >
        <VSearch
          v-model="search"
          placeholder="Search products…"
          aria-label="Search products"
          class="w-auto min-w-0 flex-1 md:min-w-60"
        />
        <VButton variant="outline" size="icon-32" aria-label="Filters" class="md:hidden">
          <VIcon name="filter-horizontal" :size="16" />
        </VButton>
        <button
          v-for="filter in filters"
          :key="filter.label"
          type="button"
          :class="[
            'hidden h-10 items-center justify-between gap-2 rounded-[20px] border border-default bg-card pr-3 pl-3.5 text-p3 font-medium text-brand md:flex',
            filter.class,
          ]"
        >
          {{ filter.label }}
          <VIcon name="arrow-down-01-sharp" :size="16" class="text-secondary" />
        </button>
      </section>

      <VButton class="w-full gap-2 md:hidden">
        <VIcon name="plus-sign" :size="16" />
        Add product
      </VButton>

      <div class="flex items-center justify-between md:min-h-11">
        <p class="text-p2 font-medium text-secondary">{{ total }} products</p>
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
        <ProductCard v-for="product in products" :key="product.id" :product="product" />
      </div>

      <div class="flex flex-col items-center gap-3 md:flex-row md:justify-between">
        <p class="text-p3 font-medium text-secondary">
          Showing {{ products.length }} of {{ total }} products
        </p>
        <VPagination v-model:page="page" :total="total" :items-per-page="PRODUCTS_PER_PAGE" />
      </div>
    </template>
  </div>
</template>
