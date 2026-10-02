<script setup lang="ts">
import { ToastProvider, ToastRoot, ToastTitle, ToastViewport } from 'reka-ui'
import { VIcon, type IconName } from '@/shared/ui/icon'
import { dismiss, toasts, type ToastTone } from './toast-queue'

const { duration = 5000 } = defineProps<{ duration?: number }>()

// No Figma design yet: a plain card on the palette primitives.
const tones: Record<ToastTone, { icon: IconName; class: string }> = {
  error: { icon: 'multiplication-sign', class: 'text-red-400' },
  success: { icon: 'checkmark-circle-01', class: 'text-mint-400' },
}
</script>

<!-- Mount once in App.vue; show toasts with toast.error() / toast.success() from this module. -->
<template>
  <ToastProvider :duration="duration" swipe-direction="up">
    <ToastRoot
      v-for="item in toasts"
      :key="item.id"
      :open="item.open"
      class="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-lg shadow-violet-500/10 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:slide-in-from-top-2 data-[swipe=end]:animate-out data-[swipe=end]:fade-out data-[swipe=move]:translate-y-(--reka-toast-swipe-move-y)"
      @update:open="(open) => open || dismiss(item.id)"
    >
      <VIcon :name="tones[item.tone].icon" :size="20" :class="tones[item.tone].class" />
      <ToastTitle class="text-p2 font-medium text-violet-500">{{ item.title }}</ToastTitle>
    </ToastRoot>

    <ToastViewport
      class="fixed inset-x-4 top-4 z-50 flex flex-col gap-2 outline-none lg:inset-x-auto lg:right-4 lg:w-[356px]"
    />
  </ToastProvider>
</template>
