<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'

// Figma "Notification button / Unread": 44px white circle, violet bell,
// red dot while there is something unread.
const { unread = false, class: className } = defineProps<{
  unread?: boolean
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <VButton
    variant="surface"
    size="icon-44"
    :aria-label="unread ? 'Notifications, unread' : 'Notifications'"
    :class="cn('relative text-link shadow-[0_8px_16px_rgb(29_42_60/0.05)]', className)"
  >
    <VIcon name="notification-02" :size="18" />
    <span
      v-if="unread"
      class="absolute top-[11px] right-[11px] size-[7px] rounded-full bg-red-300 ring-1 ring-white"
    />
  </VButton>
</template>
