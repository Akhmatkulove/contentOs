<script setup lang="ts">
import {
  PaginationEllipsis,
  PaginationList,
  PaginationListItem,
  PaginationNext,
  PaginationPrev,
  PaginationRoot,
} from 'reka-ui'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'

// Figma "CMS / Shared / Pagination": ‹ 1 2 3 4 ›. With a single page it
// collapses to the Compact variant ‹ 1 › by itself.
const { total, itemsPerPage } = defineProps<{
  // Number of items, not pages.
  total: number
  itemsPerPage: number
}>()

const page = defineModel<number>('page', { default: 1 })
</script>

<template>
  <PaginationRoot
    v-model:page="page"
    :total="total"
    :items-per-page="itemsPerPage"
    :sibling-count="1"
    show-edges
  >
    <PaginationList v-slot="{ items }" class="flex items-center gap-2">
      <PaginationPrev as-child>
        <VButton
          variant="outline"
          size="icon-32"
          aria-label="Previous page"
          class="text-neutral-500"
        >
          <VIcon name="arrow-left-01-sharp" :size="16" />
        </VButton>
      </PaginationPrev>

      <template v-for="(item, index) in items">
        <PaginationListItem
          v-if="item.type === 'page'"
          :key="`page-${item.value}`"
          :value="item.value"
          as-child
        >
          <VButton
            variant="outline"
            size="icon-32"
            class="text-p3 font-medium data-selected:border-transparent data-selected:bg-inverse data-selected:text-inverse"
          >
            {{ item.value }}
          </VButton>
        </PaginationListItem>
        <PaginationEllipsis
          v-else
          :key="`ellipsis-${index}`"
          :index="index"
          class="flex size-8 items-center justify-center text-p3 font-medium text-secondary"
        >
          …
        </PaginationEllipsis>
      </template>

      <PaginationNext as-child>
        <VButton variant="outline" size="icon-32" aria-label="Next page" class="text-neutral-500">
          <VIcon name="arrow-right-01-sharp" :size="16" />
        </VButton>
      </PaginationNext>
    </PaginationList>
  </PaginationRoot>
</template>
