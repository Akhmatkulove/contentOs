<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { closeAllModals, VModalHost } from '@/shared/ui/modal'
import { VToaster } from '@/shared/ui/toast'

// A modal belongs to the screen that opened it.
const route = useRoute()
watch(() => route.path, closeAllModals)
</script>

<template>
  <RouterView />
  <VModalHost />
  <VToaster />
</template>
