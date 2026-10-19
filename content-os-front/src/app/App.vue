<script setup lang="ts">
import { ConfigProvider } from 'reka-ui'
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { closeAllModals, VModalHost } from '@/shared/ui/modal'
import { VToaster } from '@/shared/ui/toast'

// A modal belongs to the screen that opened it.
const route = useRoute()
watch(() => route.path, closeAllModals)
</script>

<!-- The page already reserves the scrollbar's place (scrollbar-gutter: stable),
     so Reka must not pad the body again when a modal locks scrolling. -->

<template>
  <ConfigProvider :scroll-body="false">
    <RouterView />
    <VModalHost />
    <VToaster />
  </ConfigProvider>
</template>
