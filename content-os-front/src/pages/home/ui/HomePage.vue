<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/entities/session'

const router = useRouter()
const session = useSessionStore()

async function logout() {
  await session.logout()
  await router.push({ name: 'login' })
}
</script>

<!-- Placeholder until the role-specific dashboards are designed. -->
<template>
  <main class="flex min-h-dvh flex-col items-center justify-center gap-4">
    <h1 class="text-h3 text-violet-500">Hello, {{ session.me?.name }}</h1>
    <p class="text-p1 font-medium text-neutral-600">Role: {{ session.me?.role }}</p>
    <button type="button" @click="logout">Log out</button>
  </main>
</template>
