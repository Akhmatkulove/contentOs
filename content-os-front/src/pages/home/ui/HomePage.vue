<script setup lang="ts">
import { useSessionStore } from '@/entities/session'
import { useLogout } from '@/features/logout'
import { NotificationBell } from '@/widgets/notification-bell'
import ArtDirectorHome from './ArtDirectorHome.vue'

const session = useSessionStore()
const { logout, loggingOut } = useLogout()
</script>

<template>
  <ArtDirectorHome v-if="session.me?.role === 'art_director'" />
  <!-- Placeholder until the brand and creator dashboards are designed. -->
  <div v-else class="flex flex-col items-start gap-4">
    <header class="flex w-full items-center justify-between gap-4">
      <h1 class="text-h3 text-violet-500">Hello, {{ session.me?.name }}</h1>
      <NotificationBell />
    </header>
    <p class="text-p1 font-medium text-neutral-600">Role: {{ session.me?.role }}</p>
    <button type="button" :disabled="loggingOut" @click="logout">Log out</button>
  </div>
</template>
