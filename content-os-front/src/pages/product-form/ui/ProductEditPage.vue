<script setup lang="ts">
import ProductForm from './ProductForm.vue'

// The route's :id. The key gives each product a fresh form, even when the
// router reuses this page for another id.
const { id } = defineProps<{ id: string }>()
</script>

<template>
  <ProductForm :key="id" :product-id="id" />
</template>
