<script setup lang="ts">
import { VAvatar } from '@/shared/ui/avatar'
import { NotificationBell } from '@/widgets/notification-bell'
import { VStatus } from '@/shared/ui/status'
import { useProfile } from '../model/profile'

const { profile } = useProfile()
</script>

<!--
  Figma "Profile / My profile" (desktop).
  TODO(ui): mobile screen — comes later.
  TODO(ui): Edit profile button — no edit screen in Figma yet.
  TODO(api): the bio under the name and the About card — the user has no bio.
-->
<template>
  <div v-if="profile" class="flex flex-col gap-6">
    <header class="flex min-h-18 items-center justify-between gap-4">
      <div class="flex min-w-0 flex-col gap-1.5">
        <h1 class="text-h3 text-primary">My profile</h1>
        <p class="text-p2 font-medium text-secondary">Manage your personal info.</p>
      </div>
      <NotificationBell class="hidden lg:inline-flex" />
    </header>

    <section
      aria-labelledby="personal-information"
      class="flex flex-col gap-5 rounded-[20px] bg-card p-6"
    >
      <h2 id="personal-information" class="text-h5 text-primary">Personal information</h2>

      <div class="flex items-center gap-5 pb-5">
        <VAvatar
          :name="profile.name"
          :src="profile.photoUrl"
          :size="80"
          class="border border-default"
        />
        <div class="flex min-w-0 flex-wrap items-center gap-3">
          <p class="text-h4 break-words text-primary">{{ profile.name }}</p>
          <VStatus v-if="profile.role" tone="accent">{{ profile.role }}</VStatus>
        </div>
      </div>

      <dl class="grid gap-x-6 gap-y-[30px] md:grid-cols-2">
        <div v-for="field in profile.fields" :key="field.label" class="flex flex-col gap-2">
          <dt class="text-table font-medium text-secondary">{{ field.label }}</dt>
          <dd class="text-p2 font-medium break-words text-primary">{{ field.value || '—' }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>
