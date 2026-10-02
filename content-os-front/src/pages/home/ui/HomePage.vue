<script setup lang="ts">
import { useSessionStore } from '@/entities/session'
import { useLogout } from '@/features/logout'

const session = useSessionStore()
const { logout, loggingOut } = useLogout()
</script>

<!-- Placeholder until the role-specific dashboards are designed. -->
<template>
  <div class="flex flex-col items-start gap-4">
    <h1 class="text-h3 text-violet-500">Hello, {{ session.me?.name }}</h1>
    <p class="text-p1 font-medium text-neutral-600">Role: {{ session.me?.role }}</p>
    <button type="button" :disabled="loggingOut" @click="logout">Log out</button>
  </div>
</template>
