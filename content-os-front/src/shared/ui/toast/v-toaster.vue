<script setup lang="ts">
import { ToastProvider, ToastRoot, ToastTitle, ToastViewport } from 'reka-ui'
import { VIcon, type IconName } from '@/shared/ui/icon'
import { dismiss, toasts, type ToastTone } from './toast-queue'

const { duration = 4000 } = defineProps<{ duration?: number }>()

// Figma "CMS / Shared / Toast": a 48px mint card with a tick. Figma has only
// the confirmation; errors take the same card in red.
const tones: Record<ToastTone, { icon: IconName; class: string; iconClass: string }> = {
  success: { icon: 'tick-01', class: 'bg-mint-100', iconClass: 'text-mint-400' },
  error: { icon: 'multiplication-sign', class: 'bg-red-100', iconClass: 'text-red-400' },
}
</script>

<!--
  Mount once in App.vue; show toasts with toast.error() / toast.success() from this module.
  Bottom centre, sliding up: on mobile 24px above the tab bar (60px + the safe
  area, AppTabbar) and above a page's fixed action bar ([data-fixed-actions],
  tailwind.css); from lg (no tab bar) 24px above the window's edge.
-->
<template>
  <ToastProvider :duration="duration" swipe-direction="down">
    <ToastRoot
      v-for="item in toasts"
      :key="item.id"
      :open="item.open"
      :class="[
        'flex h-12 max-w-full min-w-60 items-center justify-center gap-2.5 rounded-xl px-3.5 shadow-[0_8px_24px_rgb(33_20_59/0.13)]',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:slide-out-to-bottom-2',
        'data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:slide-in-from-bottom-4',
        'data-[swipe=end]:animate-out data-[swipe=end]:fade-out data-[swipe=move]:translate-y-(--reka-toast-swipe-move-y)',
        tones[item.tone].class,
      ]"
      @update:open="(open) => open || dismiss(item.id)"
    >
      <VIcon
        :name="tones[item.tone].icon"
        :size="18"
        :class="['shrink-0', tones[item.tone].iconClass]"
      />
      <ToastTitle class="truncate text-p2 font-semibold text-primary">{{ item.title }}</ToastTitle>
    </ToastRoot>

    <ToastViewport
      class="fixed bottom-[calc(84px+var(--toast-lift,0px)+env(safe-area-inset-bottom))] left-1/2 z-50 flex w-max max-w-[calc(100vw-32px)] -translate-x-1/2 flex-col items-center gap-2 outline-none lg:bottom-6"
    />
  </ToastProvider>
</template>
