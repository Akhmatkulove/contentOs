<script setup lang="ts">
import { VSearch } from '@/shared/ui/search'
import { VSelect } from '@/shared/ui/select'
import { productSortOptions, type ProductSort, type ShootProduct } from '../model/products-tab'
import ShootProductCard from './ShootProductCard.vue'

// Figma "Shoot / Products": search, sort and the products as cards.
// TODO(ui): mobile filters sheet (Figma "CMS / Mobile / Filter button").
const { products, total } = defineProps<{ products: ShootProduct[]; total: number }>()

const search = defineModel<string>('search', { required: true })
const sort = defineModel<ProductSort>('sort', { required: true })
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <section
      aria-label="Search and sort"
      class="flex items-center gap-2.5 rounded-2xl bg-card p-4 shadow-[0_8px_32px_4px_rgb(29_42_60/0.05)] md:p-3 md:shadow-none"
    >
      <VSearch
        v-model="search"
        placeholder="Search products…"
        aria-label="Search products"
        class="min-w-0 flex-1"
      />
      <VSelect
        v-model="sort"
        :options="productSortOptions"
        variant="filter"
        aria-label="Sort"
        class="hidden w-[190px] md:block"
      />
    </section>

    <ul
      v-if="products.length"
      class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3"
    >
      <li v-for="product in products" :key="product.id" class="min-w-0">
        <ShootProductCard :product="product" />
      </li>
    </ul>
    <p v-else class="rounded-2xl bg-card p-8 text-center text-p2 font-medium text-secondary">
      {{ total ? `No products match “${search}”.` : 'No products in this shoot.' }}
    </p>
  </div>
</template>
