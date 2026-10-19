<script setup lang="ts">
import { computed } from 'vue'
import { useSessionStore } from '@/entities/session'
import { NotificationBell } from '@/widgets/notification-bell'

// Figma "CMS / Mobile / Topbar": the user's avatar, the screen title, the bell.
// Shown below lg, where there is no sidebar.
const { title } = defineProps<{ title: string }>()

const session = useSessionStore()
const initial = computed(() => (session.me?.name ?? '').charAt(0).toUpperCase())
</script>

<template>
  <header class="flex h-14 items-center justify-between gap-4">
    <div class="flex min-w-0 items-center gap-2">
      <img
        v-if="session.me?.photo_url"
        :src="session.me.photo_url"
        alt=""
        class="size-12 shrink-0 rounded-full object-cover"
      />
      <div
        v-else
        aria-hidden="true"
        class="flex size-12 shrink-0 items-center justify-center rounded-full bg-violet-100 text-p1 font-semibold text-violet-400"
      >
        {{ initial }}
      </div>
      <h1 class="truncate text-h6 text-primary">{{ title }}</h1>
    </div>
    <NotificationBell />
  </header>
</template>
