<script setup lang="ts">
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { useResizeObserver } from '@vueuse/core'
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { useHostedModal } from '@/shared/ui/modal'
import type { MediaFile } from './index'
import {
  clampView,
  DOUBLE_TAP_MS,
  FIT,
  maxScale,
  pinchView,
  swipeGesture,
  TAP_SLOP,
  tapScale,
  wheelScale,
  zoomAt,
  type Point,
  type Size,
  type View,
} from './zoom'

// Files fullscreen, one at a time: arrows, keys, swipes and
// the strip of thumbnails leaf through them; images zoom with the wheel, a
// pinch, a double tap or a click, and pan by dragging. A swipe down closes it.
const { files, start, title } = defineProps<{
  files: MediaFile[]
  start: number
  title: string
}>()
defineEmits<{ close: [] }>()

const { open, dismiss } = useHostedModal()

const index = ref(start)
const file = computed(() => files[index.value]!)
const isImage = computed(() => file.value.kind === 'image')
// Slides in from the side it was leafed to.
const direction = ref<'next' | 'prev'>('next')

const view = ref<View>(FIT)
const zoomed = computed(() => view.value.scale > 1.01)
// Off while a finger or the mouse drives the image, so it follows without lag.
const animate = ref(true)
// The unzoomed image follows a sideways or downward drag.
const drag = ref<Point>({ x: 0, y: 0 })
const loaded = ref(false)
const failed = ref(false)

const stage = useTemplateRef('stage')
// Looked up by file: a ref on the keyed slide would be cleared when the old one leaves.
function currentImage(): HTMLImageElement | null {
  return stage.value?.querySelector<HTMLImageElement>(`img[data-file="${file.value.id}"]`) ?? null
}
const stageSize = shallowRef<Size>({ width: 0, height: 0 })
useResizeObserver(stage, ([entry]) => {
  stageSize.value = { width: entry!.contentRect.width, height: entry!.contentRect.height }
  view.value = clamp(view.value)
})

// The image's laid-out size (transforms don't change offset sizes) and the original's.
function fitSize(): Size {
  const image = currentImage()
  return { width: image?.offsetWidth ?? 0, height: image?.offsetHeight ?? 0 }
}
function naturalSize(): Size {
  const image = currentImage()
  return { width: image?.naturalWidth ?? 0, height: image?.naturalHeight ?? 0 }
}
function currentMax(): number {
  return maxScale(naturalSize(), fitSize())
}
function clamp(next: View): View {
  return clampView(next, fitSize(), stageSize.value, currentMax())
}
// A point of the screen measured from the stage centre.
function fromCentre(clientX: number, clientY: number): Point {
  const rect = stage.value!.getBoundingClientRect()
  return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 }
}

function zoomTo(scale: number, at: Point = { x: 0, y: 0 }) {
  if (!isImage.value || !loaded.value) return
  view.value = clamp(zoomAt(view.value, scale, at, currentMax()))
}
function toggleZoom(at?: Point) {
  if (zoomed.value) view.value = FIT
  else zoomTo(tapScale(naturalSize(), fitSize()), at)
}
// A file paged away from keeps loading; only the one on screen sets the state.
function onMediaEvent(event: Event, ok: boolean) {
  if ((event.target as HTMLElement).dataset.file !== file.value.id) return
  if (ok) loaded.value = true
  else failed.value = true
}

const zoomLabel = computed(() => `${Math.round(view.value.scale * 100)}%`)

function go(to: number) {
  if (to < 0 || to >= files.length || to === index.value) return
  direction.value = to > index.value ? 'next' : 'prev'
  index.value = to
}

watch(index, () => {
  // A tap on the previous file doesn't make a double tap with one on this.
  lastTap = null
  view.value = FIT
  drag.value = { x: 0, y: 0 }
  loaded.value = false
  failed.value = false
})

// The neighbours load in the background, so leafing doesn't wait.
watch(
  index,
  (current) => {
    for (const near of [current - 1, current + 1]) {
      const neighbour = files[near]
      if (neighbour?.kind === 'image') new Image().src = neighbour.url
    }
  },
  { immediate: true },
)

// The active thumbnail stays in sight in the strip.
const strip = useTemplateRef('strip')
watch(
  index,
  async (current) => {
    await nextTick()
    strip.value
      ?.querySelectorAll('[data-thumb]')
      [current]?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  },
  { immediate: true },
)

function onKeydown(event: KeyboardEvent) {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  // The video's own controls seek and change volume with the arrows.
  if ((event.target as Element).closest('video')) return
  const keys: Record<string, () => void> = {
    ArrowRight: () => go(index.value + 1),
    ArrowLeft: () => go(index.value - 1),
    Home: () => go(0),
    End: () => go(files.length - 1),
    '+': () => zoomTo(view.value.scale * 1.5),
    '=': () => zoomTo(view.value.scale * 1.5),
    '-': () => zoomTo(view.value.scale / 1.5),
    '0': () => (view.value = FIT),
  }
  const action = keys[event.key]
  if (!action) return
  event.preventDefault()
  action()
}

// Focus starts on the stage, not on the first button: keys work at once and
// no focus ring shows until the user tabs.
function onOpenFocus(event: Event) {
  event.preventDefault()
  stage.value?.focus()
}

// Wheel ticks arrive in bursts: the image follows them without lag and gets its
// transition back once they stop, for the buttons and keys.
let wheelTimer: ReturnType<typeof setTimeout> | undefined
function onWheel(event: WheelEvent) {
  if (!isImage.value) return
  event.preventDefault()
  const scale = wheelScale(
    view.value.scale,
    event.deltaY,
    event.ctrlKey,
    event.deltaMode === WheelEvent.DOM_DELTA_LINE,
  )
  animate.value = false
  clearTimeout(wheelTimer)
  wheelTimer = setTimeout(() => (animate.value = true), 150)
  zoomTo(scale, fromCentre(event.clientX, event.clientY))
}
onBeforeUnmount(() => clearTimeout(wheelTimer))

// Pointers on the stage: one drags (pans a zoomed image, else swipes), two pinch.
const pointers = new Map<number, Point>()
let gesture: {
  // The finger of a one-finger gesture; null for a pinch.
  pointerId: number | null
  startView: View
  start: Point
  startTime: number
  moved: boolean
  // Taken where it started: under pointer capture every later event targets the stage.
  onMedia: boolean
  // The finger left after a pinch: it only pans, it never leafs or closes.
  afterPinch: boolean
  pinch: { distance: number; mid: Point } | null
} | null = null
let lastTap: { time: number; at: Point } | null = null

function pinchOf(): { distance: number; mid: Point } {
  const [a, b] = [...pointers.values()] as [Point, Point]
  return {
    distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
    mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
  }
}

function onPointerDown(event: PointerEvent) {
  const target = event.target as Element
  // The video keeps its own controls.
  if (target.closest('video, [data-control]')) return
  if (event.pointerType === 'mouse' && event.button !== 0) return
  stage.value!.setPointerCapture(event.pointerId)
  const at = fromCentre(event.clientX, event.clientY)
  pointers.set(event.pointerId, at)
  animate.value = false
  if (pointers.size === 2 && isImage.value && loaded.value) {
    drag.value = { x: 0, y: 0 }
    gesture = {
      pointerId: null,
      startView: view.value,
      start: at,
      startTime: 0,
      moved: true,
      onMedia: false,
      afterPinch: false,
      pinch: pinchOf(),
    }
  } else if (pointers.size === 1) {
    gesture = {
      pointerId: event.pointerId,
      startView: view.value,
      start: at,
      startTime: event.timeStamp,
      moved: false,
      onMedia: !!target.closest('[data-media]'),
      afterPinch: false,
      pinch: null,
    }
  }
}

function onPointerMove(event: PointerEvent) {
  if (!gesture || !pointers.has(event.pointerId)) return
  const at = fromCentre(event.clientX, event.clientY)
  pointers.set(event.pointerId, at)
  if (gesture.pinch) {
    if (pointers.size >= 2)
      view.value = clamp(pinchView(gesture.startView, gesture.pinch, pinchOf(), currentMax()))
    return
  }
  // Another finger that didn't start a pinch (the image is still loading).
  if (event.pointerId !== gesture.pointerId) return
  const dx = at.x - gesture.start.x
  const dy = at.y - gesture.start.y
  if (!gesture.moved && Math.hypot(dx, dy) < TAP_SLOP) return
  gesture.moved = true
  if (zoomed.value) {
    view.value = clamp({
      ...gesture.startView,
      x: gesture.startView.x + dx,
      y: gesture.startView.y + dy,
    })
  } else if (event.pointerType !== 'mouse' && !gesture.afterPinch) {
    // Down only, with resistance; sideways as far as the finger goes.
    drag.value = Math.abs(dx) > Math.abs(dy) ? { x: dx, y: 0 } : { x: 0, y: Math.max(0, dy) * 0.6 }
  }
}

function onPointerUp(event: PointerEvent) {
  if (!pointers.has(event.pointerId)) return
  const at = fromCentre(event.clientX, event.clientY)
  pointers.delete(event.pointerId)
  const current = gesture
  if (!current) return
  if (current.pinch) {
    // The finger left on the screen pans on from here.
    const rest = [...pointers.entries()][0]
    gesture = rest
      ? {
          pointerId: rest[0],
          startView: view.value,
          start: rest[1],
          startTime: event.timeStamp,
          moved: true,
          onMedia: false,
          afterPinch: true,
          pinch: null,
        }
      : null
    if (!rest) animate.value = true
    return
  }
  if (event.pointerId !== current.pointerId) return
  gesture = null
  animate.value = true
  drag.value = { x: 0, y: 0 }

  if (current.moved) {
    if (zoomed.value || current.afterPinch || event.pointerType === 'mouse') return
    const swipe = swipeGesture(
      at.x - current.start.x,
      at.y - current.start.y,
      event.timeStamp - current.startTime,
    )
    if (swipe === 'next') go(index.value + 1)
    else if (swipe === 'prev') go(index.value - 1)
    else if (swipe === 'close') dismiss()
    return
  }
  onTap(event, at, current.onMedia)
}

function onPointerCancel(event: PointerEvent) {
  pointers.delete(event.pointerId)
  gesture = null
  drag.value = { x: 0, y: 0 }
  animate.value = true
}

// A click or tap: on the image a mouse click zooms in or out, a touch needs a
// double tap; on the empty stage around an unzoomed image it closes the viewer.
function onTap(event: PointerEvent, at: Point, onMedia: boolean) {
  if (!onMedia) {
    if (!zoomed.value) dismiss()
    return
  }
  if (!isImage.value) return
  if (event.pointerType === 'mouse') {
    toggleZoom(at)
    return
  }
  if (lastTap && event.timeStamp - lastTap.time < DOUBLE_TAP_MS) {
    lastTap = null
    toggleZoom(at)
  } else lastTap = { time: event.timeStamp, at }
}

const mediaStyle = computed(() => {
  const { scale, x, y } = view.value
  return {
    transform: `translate3d(${x + drag.value.x}px, ${y + drag.value.y}px, 0) scale(${scale})`,
    // Fades as it's pulled down to close.
    opacity: drag.value.y ? Math.max(0.4, 1 - drag.value.y / 400) : undefined,
  }
})

const cursor = computed(() => {
  if (!isImage.value || !loaded.value) return 'cursor-default'
  return zoomed.value ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
})
</script>

<!--
  Not in Figma: a dark fullscreen stage so a file reads as it was shot.
  Built on the hosted modal: opened with openModal(), closed by route changes,
  Esc, the × or a swipe down. Focus trap and scroll lock come from Reka.
-->
<template>
  <DialogRoot :open="open" @update:open="(value) => value || dismiss()">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-50 bg-black/96 duration-300 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none"
      />
      <DialogContent
        :aria-describedby="undefined"
        class="fixed inset-0 z-50 flex flex-col text-inverse outline-none duration-300 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none"
        @keydown="onKeydown"
        @open-auto-focus="onOpenFocus"
      >
        <header
          class="relative z-10 flex items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 md:px-6 md:pt-5"
        >
          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <DialogTitle class="truncate text-p1 font-semibold">{{ title }}</DialogTitle>
            <p class="text-p3 font-medium text-neutral-500 tabular-nums" aria-live="polite">
              {{ index + 1 }} / {{ files.length }}
            </p>
          </div>
          <template v-if="isImage">
            <VButton
              variant="ghost"
              size="36"
              :aria-label="zoomed ? 'Fit to screen' : 'Zoom in'"
              :disabled="!loaded"
              class="hidden gap-1.5 px-3 text-p3 font-medium text-inverse tabular-nums hover:bg-white/10 active:bg-white/15 md:inline-flex"
              @click="toggleZoom()"
            >
              <VIcon :name="zoomed ? 'aspect-ratio' : 'search'" :size="16" />
              {{ zoomed ? zoomLabel : 'Zoom' }}
            </VButton>
          </template>
          <VButton
            as-child
            variant="ghost"
            size="icon-40"
            class="text-inverse hover:bg-white/10 active:bg-white/15"
          >
            <a :href="file.url" target="_blank" rel="noopener" aria-label="Open original">
              <VIcon name="link-square-01" :size="18" />
            </a>
          </VButton>
          <VButton
            variant="ghost"
            size="icon-40"
            aria-label="Close"
            class="text-inverse hover:bg-white/10 active:bg-white/15"
            @click="dismiss"
          >
            <VIcon name="multiplication-sign" :size="20" />
          </VButton>
        </header>

        <div
          ref="stage"
          tabindex="-1"
          :class="[
            'relative min-h-0 flex-1 touch-none overflow-hidden outline-none select-none',
            cursor,
          ]"
          @wheel="onWheel"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerCancel"
        >
          <Transition
            :enter-from-class="
              direction === 'next' ? 'opacity-0 translate-x-8' : 'opacity-0 -translate-x-8'
            "
            enter-active-class="transition duration-250 ease-out motion-reduce:transition-none"
            leave-active-class="absolute inset-0 transition-opacity duration-150 motion-reduce:transition-none"
            leave-to-class="opacity-0"
          >
            <div
              :key="file.id"
              class="absolute inset-0 flex items-center justify-center p-2 md:px-20 md:py-4"
            >
              <img
                v-if="isImage"
                data-media
                :data-file="file.id"
                alt=""
                draggable="false"
                :src="file.url"
                :style="mediaStyle"
                :class="[
                  'max-h-full max-w-full object-contain will-change-transform',
                  animate && 'transition-[transform,opacity] duration-200 ease-out',
                  loaded ? 'opacity-100' : 'opacity-0',
                ]"
                @load="onMediaEvent($event, true)"
                @error="onMediaEvent($event, false)"
              />
              <video
                v-else
                data-media
                :data-file="file.id"
                :src="file.url"
                :style="mediaStyle"
                controls
                autoplay
                playsinline
                :class="[
                  'max-h-full max-w-full',
                  animate && 'transition-[transform,opacity] duration-200 ease-out',
                ]"
                @loadedmetadata="onMediaEvent($event, true)"
                @error="onMediaEvent($event, false)"
              />
            </div>
          </Transition>

          <div
            v-if="!loaded && !failed"
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <span
              class="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white"
            />
          </div>
          <p
            v-if="failed"
            class="pointer-events-none absolute inset-0 flex items-center justify-center text-p2 font-medium text-neutral-500"
          >
            Couldn’t load this file.
          </p>

          <!-- Desktop arrows; touch leafs with a swipe. -->
          <template v-if="files.length > 1">
            <VButton
              data-control
              variant="ghost"
              size="icon-44"
              aria-label="Previous file"
              :disabled="index === 0"
              class="absolute top-1/2 left-5 hidden -translate-y-1/2 bg-white/10 text-inverse backdrop-blur-md hover:bg-white/20 active:bg-white/25 disabled:opacity-0 md:inline-flex"
              @click="go(index - 1)"
            >
              <VIcon name="arrow-left-01-sharp" :size="20" />
            </VButton>
            <VButton
              data-control
              variant="ghost"
              size="icon-44"
              aria-label="Next file"
              :disabled="index === files.length - 1"
              class="absolute top-1/2 right-5 hidden -translate-y-1/2 bg-white/10 text-inverse backdrop-blur-md hover:bg-white/20 active:bg-white/25 disabled:opacity-0 md:inline-flex"
              @click="go(index + 1)"
            >
              <VIcon name="arrow-right-01-sharp" :size="20" />
            </VButton>
          </template>
        </div>

        <!-- Thumbnails: every file, the open one outlined. -->
        <nav
          v-if="files.length > 1"
          aria-label="Files"
          :inert="zoomed"
          :class="[
            'relative z-10 transition-opacity duration-200',
            zoomed && 'pointer-events-none opacity-0',
          ]"
        >
          <ul
            ref="strip"
            class="scrollbar-none mx-auto flex w-fit max-w-full gap-2 overflow-x-auto px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-5"
          >
            <li v-for="(item, i) in files" :key="item.id" data-thumb class="shrink-0">
              <VButton
                variant="ghost"
                :aria-label="`File ${i + 1} of ${files.length}`"
                :aria-current="i === index ? 'true' : undefined"
                :class="[
                  'relative size-12 overflow-hidden rounded-lg p-0 transition md:size-14',
                  i === index
                    ? 'opacity-100 ring-2 ring-white ring-offset-2 ring-offset-black'
                    : 'opacity-45 hover:opacity-80',
                ]"
                @click="go(i)"
              >
                <img
                  v-if="item.kind === 'image'"
                  :src="item.url"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  class="size-full object-cover"
                />
                <span v-else class="flex size-full items-center justify-center bg-white/10">
                  <VIcon name="play" :size="16" />
                </span>
              </VButton>
            </li>
          </ul>
        </nav>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
