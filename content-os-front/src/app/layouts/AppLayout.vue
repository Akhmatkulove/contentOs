<script setup lang="ts">
import AppSidebar from './AppSidebar.vue'
import AppTabbar from './AppTabbar.vue'
</script>

<template>
  <div class="min-h-dvh bg-neutral-200">
    <AppSidebar />

    <!-- Bottom padding on mobile clears the fixed tab bar (60px + safe area). -->
    <main
      class="px-4 pt-4 pb-[calc(96px+env(safe-area-inset-bottom))] lg:pt-10 lg:pr-6 lg:pb-6 lg:pl-[280px]"
    >
      <RouterView />
    </main>

    <AppTabbar class="lg:hidden" />
  </div>
</template>
