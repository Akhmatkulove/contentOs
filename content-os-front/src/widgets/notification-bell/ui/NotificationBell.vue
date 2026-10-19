<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { useId, type HTMLAttributes } from 'vue'
import { VButton } from '@/shared/ui/button'
import { VNotificationButton } from '@/shared/ui/notification-button'
import { selectContentClass } from '@/shared/ui/select'
import { VThumbnail } from '@/shared/ui/thumbnail'
import { useNotificationBell } from '../model/notification-bell'

// The bell with the user's notifications (docs/adr/0020). Figma has the button
// ("Notification button / Unread") but no panel yet: a popover in the look of
// the select dropdowns.
// TODO(ui): notifications panel — not in Figma yet.
const { class: className } = defineProps<{ class?: HTMLAttributes['class'] }>()

const { notifications, unread, open, openNotification, readAll, readingAll } = useNotificationBell()
const titleId = useId()
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <VNotificationButton :unread="unread > 0" :class="className" />
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        :aria-labelledby="titleId"
        align="end"
        :side-offset="8"
        :collision-padding="16"
        :class="[
          selectContentClass,
          'w-[min(360px,calc(100vw-32px))] gap-1 [--available-height:var(--reka-popover-content-available-height)] max-h-[min(480px,var(--available-height))]',
        ]"
      >
        <div class="flex items-center justify-between gap-3 px-2 py-1.5">
          <h2 :id="titleId" class="text-p2 font-semibold text-primary">Notifications</h2>
          <VButton
            v-if="unread > 0"
            variant="ghost"
            size="28"
            class="text-link"
            :disabled="readingAll"
            @click="readAll"
          >
            Mark all as read
          </VButton>
        </div>

        <p
          v-if="!notifications.length"
          class="px-2 py-6 text-center text-p3 font-medium text-secondary"
        >
          No notifications yet.
        </p>
        <ul v-else class="flex min-h-0 flex-col gap-0.5 overflow-y-auto">
          <li v-for="item in notifications" :key="item.id">
            <RouterLink
              :to="item.to"
              class="flex w-full items-start gap-3 rounded-lg p-2 transition-colors outline-none hover:bg-subtle focus-visible:bg-subtle"
              @click="openNotification(item)"
            >
              <VThumbnail
                :src="item.photoUrl"
                :icon-size="12"
                class="h-10 w-8 shrink-0 rounded-md"
              />
              <span class="flex min-w-0 flex-1 flex-col gap-1">
                <span
                  :class="[
                    'text-p3 break-words',
                    item.read ? 'font-medium text-secondary' : 'font-semibold text-primary',
                  ]"
                >
                  {{ item.text }}
                </span>
                <span class="text-p4 font-medium text-secondary">{{ item.time }}</span>
              </span>
              <span v-if="!item.read" class="mt-1.5 size-2 shrink-0 rounded-full bg-red-300">
                <span class="sr-only">Unread</span>
              </span>
            </RouterLink>
          </li>
        </ul>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
