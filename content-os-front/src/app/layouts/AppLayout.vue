<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppTabbar from './AppTabbar.vue'
import AppTopbar from './AppTopbar.vue'

const route = useRoute()
</script>

<template>
  <div class="min-h-dvh bg-neutral-200">
    <AppSidebar />

    <!-- Bottom padding on mobile clears the fixed tab bar (60px + safe area). -->
    <main
      class="px-4 pt-4 pb-[calc(96px+env(safe-area-inset-bottom))] lg:pt-10 lg:pr-6 lg:pb-6 lg:pl-[280px]"
    >
      <!-- Screens opt in with meta.title; the others still draw their own mobile heading. -->
      <AppTopbar v-if="route.meta.title" :title="route.meta.title" class="mb-9 lg:hidden" />
      <RouterView />
    </main>

    <AppTabbar class="lg:hidden" />
  </div>
</template>
