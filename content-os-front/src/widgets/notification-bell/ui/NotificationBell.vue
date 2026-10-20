<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { nextTick, useId, useTemplateRef, watch, type HTMLAttributes } from 'vue'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VNotificationButton } from '@/shared/ui/notification-button'
import { selectContentClass } from '@/shared/ui/select'
import { VThumbnail } from '@/shared/ui/thumbnail'
import { useNotificationBell } from '../model/notification-bell'

// The bell with the user's notifications (docs/adr/0020). Figma has the button
// ("Notification button / Unread") but no panel yet: a popover in the look of
// the select dropdowns.
// TODO(ui): notifications panel — not in Figma yet.
const { class: className } = defineProps<{ class?: HTMLAttributes['class'] }>()

const {
  notifications,
  unread,
  open,
  openNotification,
  readAll,
  readingAll,
  confirmingClear,
  confirmClear,
  clearing,
} = useNotificationBell()
const titleId = useId()

// The header swaps to the question and back: keep the keyboard focus on it,
// starting from Cancel so Enter doesn't delete by accident.
const header = useTemplateRef('header')
watch(confirmingClear, async (asking, wasAsking) => {
  await nextTick()
  if (asking) header.value?.querySelector<HTMLElement>('[data-cancel]')?.focus()
  else if (wasAsking) header.value?.querySelector<HTMLElement>('[data-clear]')?.focus()
})

// Escape while asking cancels the question, not the whole panel.
function onEscape(event: KeyboardEvent) {
  if (!confirmingClear.value) return
  event.preventDefault()
  confirmingClear.value = false
}
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <VNotificationButton :unread="unread > 0" :class="className" />
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        :aria-labelledby="titleId"
        @escape-key-down="onEscape"
        align="end"
        :side-offset="8"
        :collision-padding="16"
        :class="[
          selectContentClass,
          'w-[min(360px,calc(100vw-32px))] gap-1 [--available-height:var(--reka-popover-content-available-height)] max-h-[min(480px,var(--available-height))]',
        ]"
      >
        <div ref="header" class="flex min-h-10 items-center justify-between gap-3 px-2 py-1.5">
          <h2
            :id="titleId"
            :class="['text-p2 font-semibold text-primary', confirmingClear && 'sr-only']"
          >
            Notifications
          </h2>
          <template v-if="!confirmingClear">
            <div class="flex items-center gap-1">
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
              <VButton
                v-if="notifications.length"
                data-clear
                variant="ghost"
                size="icon-32"
                class="size-7 hover:bg-subtle hover:text-primary active:bg-subtle"
                aria-label="Clear all"
                title="Clear all"
                :disabled="clearing"
                @click="confirmingClear = true"
              >
                <VIcon name="delete-03" :size="16" />
              </VButton>
            </div>
          </template>
          <template v-else>
            <p class="text-p3 font-semibold text-primary">Clear all notifications?</p>
            <div class="flex items-center gap-1">
              <VButton
                data-cancel
                variant="ghost"
                size="28"
                class="hover:bg-subtle active:bg-subtle"
                @click="confirmingClear = false"
              >
                Cancel
              </VButton>
              <VButton
                variant="ghost"
                size="28"
                class="bg-red-100 font-semibold text-red-400 active:inset-ring active:inset-ring-red-200"
                @click="confirmClear"
              >
                Clear all
              </VButton>
            </div>
          </template>
        </div>

        <p
          v-if="!notifications.length"
          class="px-2 py-6 text-center text-p3 font-medium text-secondary"
        >
          You’re all caught up.
        </p>
        <!-- While asking, the list fades: it is what Clear all takes away. -->
        <ul
          v-else
          :class="[
            'flex min-h-0 flex-col gap-0.5 overflow-y-auto transition-opacity',
            confirmingClear && 'pointer-events-none opacity-40',
          ]"
          :inert="confirmingClear"
        >
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
