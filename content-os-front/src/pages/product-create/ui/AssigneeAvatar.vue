<script setup lang="ts">
import type { TeamMember } from '../api/team'

// Figma "CMS / Shared / Avatar", size 28: the photo, or the first letter of the name.
const { member } = defineProps<{ member: TeamMember }>()
</script>

<template>
  <img
    v-if="member.photo_url"
    :src="member.photo_url"
    alt=""
    class="size-7 shrink-0 rounded-full object-cover"
  />
  <span
    v-else
    class="flex size-7 shrink-0 items-center justify-center rounded-full bg-status-accent text-p4 font-semibold text-link"
    aria-hidden="true"
  >
    {{ (member.name || 'U').slice(0, 1).toUpperCase() }}
  </span>
</template>
