<script setup lang="ts">
import { computed, inject, type HTMLAttributes } from 'vue'
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { cn } from '@/shared/lib'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { grabberGesture } from './grabber-gesture'
import { modalContextKey } from './modal-stack'

// Figma "Modal / …" on desktop, "Sheet / …" (bottom sheet) on mobile. One
// Reka Dialog, the look switches by breakpoint in CSS only: no second tree,
// nothing remounts on resize. Content isn't rendered while closed.
// Focus trap, Esc, outside click, scroll lock and focus return come from Reka.
// Lives only inside a modal opened with openModal(): the host owns open state.
const {
  title,
  description,
  class: className,
} = defineProps<{
  title: string
  // Shown on desktop only (the mobile sheet has none); still read by screen readers.
  description?: string
  class?: HTMLAttributes['class']
}>()

const modal = inject(modalContextKey, null)
if (!modal) throw new Error('VModal must be the root of a component opened with openModal().')
const { open, dismiss } = modal

// Mobile first: a sheet glued to the bottom that slides up. From md: a centred
// card that fades and scales in (the slide is reset to 0).
const contentBase = [
  'fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col gap-4 rounded-t-[20px] bg-card px-4 pb-[max(2rem,env(safe-area-inset-bottom))] outline-none',
  'duration-300 ease-out data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom motion-reduce:animate-none',
  'md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:max-h-[calc(100dvh-3rem)] md:w-[calc(100%-3rem)] md:max-w-180 md:-translate-1/2 md:rounded-3xl md:p-6',
  'md:duration-200 md:data-[state=closed]:fade-out-0 md:data-[state=closed]:zoom-out-95 md:data-[state=closed]:slide-out-to-bottom-0 md:data-[state=open]:fade-in-0 md:data-[state=open]:zoom-in-95 md:data-[state=open]:slide-in-from-bottom-0',
].join(' ')

const contentClass = computed(() => (className ? cn(contentBase, className) : contentBase))

// Mobile closes through the grabber: tap or pull down. The sheet itself
// stays put, the exit animation plays after release.
let startY: number | null = null
let moved = false

function onGrabberDown(event: PointerEvent) {
  // The pointer soon leaves the 28px strip; keep its pointerup on the grabber.
  // Touch is captured implicitly, mouse and pen are not.
  ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
  startY = event.clientY
  moved = false
}

function onGrabberUp(event: PointerEvent) {
  if (startY === null) return
  const gesture = grabberGesture(event.clientY - startY)
  startY = null
  moved = gesture !== 'tap'
  if (gesture === 'swipe-down') dismiss()
}

// Taps and keyboard (Enter/Space) arrive here; a drag that ended up elsewhere
// must not count as a tap.
function onGrabberClick() {
  if (moved) {
    moved = false
    return
  }
  dismiss()
}
</script>

<template>
  <DialogRoot :open="open" @update:open="(value) => value || dismiss()">
    <DialogPortal>
      <!-- Figma has no scrim colour yet; no backdrop blur, it is costly on phones. -->
      <DialogOverlay
        class="fixed inset-0 z-50 bg-black/40 duration-300 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none md:duration-200"
      />
      <!-- Without a description Reka still points aria-describedby at a missing
           element and warns; an explicit undefined drops the attribute. -->
      <DialogContent
        :class="contentClass"
        v-bind="description ? {} : { 'aria-describedby': undefined }"
      >
        <!-- Figma "CMS / Mobile / Sheet grabber". The whole 28px strip is the hit
             area; -mb-4 cancels the gap so the title sits where Figma puts it. -->
        <VButton
          variant="ghost"
          size="icon-24"
          aria-label="Close"
          class="-mb-4 h-7 w-full touch-none items-start rounded-none pt-2 md:hidden"
          @pointerdown="onGrabberDown"
          @pointerup="onGrabberUp"
          @pointercancel="startY = null"
          @click="onGrabberClick"
        >
          <span class="h-1 w-9 rounded-full bg-neutral-400" />
        </VButton>

        <header class="flex min-h-8 items-center gap-4 md:items-start">
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <DialogTitle class="text-h6 text-brand md:text-h4">{{ title }}</DialogTitle>
            <DialogDescription
              v-if="description"
              class="hidden text-table font-medium text-secondary md:block"
            >
              {{ description }}
            </DialogDescription>
          </div>
          <VButton
            variant="ghost"
            size="icon-24"
            aria-label="Close"
            class="hidden md:inline-flex"
            @click="dismiss"
          >
            <VIcon name="multiplication-sign" :size="20" />
          </VButton>
        </header>

        <!-- Only the body scrolls; header and footer stay in place. The negative
             margin moves the scrollbar to the edge and keeps focus rings unclipped. -->
        <div class="-mx-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 md:-mx-6 md:px-6">
          <slot />
        </div>

        <footer v-if="$slots.footer">
          <slot name="footer" />
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
