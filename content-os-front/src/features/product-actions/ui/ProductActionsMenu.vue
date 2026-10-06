<script setup lang="ts">
import { VDropdownMenu, VDropdownMenuItem } from '@/shared/ui/dropdown-menu'
import {
  archiveLabel,
  useProductActions,
  type ProductActionsTarget,
} from '../model/product-actions'

// The product's "…" menu. The screen passes its own "…" button in #trigger:
// cards, the product header and the mobile top bar draw it differently.
const { product, canEdit } = defineProps<{
  product: ProductActionsTarget
  // The brand that owns the product: Edit and Archive.
  canEdit: boolean
}>()

const { edit, copyLink, toggleArchive, archiving } = useProductActions()
</script>

<template>
  <VDropdownMenu>
    <template #trigger>
      <slot name="trigger" />
    </template>
    <VDropdownMenuItem v-if="canEdit" @select="edit(product)">Edit product</VDropdownMenuItem>
    <VDropdownMenuItem @select="copyLink(product)">Copy link</VDropdownMenuItem>
    <VDropdownMenuItem v-if="canEdit" :disabled="archiving" @select="toggleArchive(product)">
      {{ archiveLabel(product.status) }}
    </VDropdownMenuItem>
  </VDropdownMenu>
</template>
