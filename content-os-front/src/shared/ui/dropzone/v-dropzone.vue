<script setup lang="ts">
import { ref, useTemplateRef, type HTMLAttributes } from 'vue'
import { cn } from '@/shared/lib'
import { VIcon } from '@/shared/ui/icon'
import { matchesAccept } from './accept'

// Figma "CMS / Shared / Dropzone". A <label> around a hidden file input:
// click, Enter/Space and drag & drop all pick files. Touch screens can't drag,
// so the mobile title only offers choosing. While files are dragged over it the
// fill switches to the component's base status-accent.
const {
  accept = '',
  multiple = true,
  hint,
  disabled = false,
  class: className,
} = defineProps<{
  // Same format as <input accept>. Dropped files that don't match go to `reject`.
  accept?: string
  multiple?: boolean
  // Second line, e.g. "Images • upload multiple files".
  hint?: string
  disabled?: boolean
  class?: HTMLAttributes['class']
}>()

const emit = defineEmits<{
  select: [files: File[]]
  reject: [files: File[]]
}>()

const input = useTemplateRef<HTMLInputElement>('input')
const dragging = ref(false)
// dragenter/dragleave also fire for children; count them to know when the
// pointer really left.
let depth = 0

function take(list: FileList | null | undefined) {
  const files = Array.from(list ?? [])
  const picked = multiple ? files : files.slice(0, 1)
  const accepted = picked.filter((file) => matchesAccept(file, accept))
  const rejected = picked.filter((file) => !matchesAccept(file, accept))
  if (accepted.length) emit('select', accepted)
  if (rejected.length) emit('reject', rejected)
}

function onChange() {
  take(input.value?.files)
  // Lets the same file be picked again after it was removed.
  if (input.value) input.value.value = ''
}

function onDragEnter() {
  if (disabled) return
  depth++
  dragging.value = true
}

function onDragLeave() {
  depth = Math.max(0, depth - 1)
  if (!depth) dragging.value = false
}

function onDrop(event: DragEvent) {
  depth = 0
  dragging.value = false
  if (!disabled) take(event.dataTransfer?.files)
}

// For "Add more" buttons outside the zone.
function open() {
  if (!disabled) input.value?.click()
}

defineExpose({ open })
</script>

<template>
  <label
    :class="
      cn(
        'flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-400 px-5 py-3 text-center transition-colors',
        'has-focus-visible:ring-2 has-focus-visible:ring-violet-300',
        dragging ? 'bg-status-accent' : 'bg-violet-100/20 hover:bg-status-accent',
        disabled && 'cursor-not-allowed bg-subtle hover:bg-subtle',
        className,
      )
    "
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <input
      ref="input"
      type="file"
      class="sr-only"
      :accept="accept || undefined"
      :multiple="multiple"
      :disabled="disabled"
      @change="onChange"
    />
    <VIcon name="image-02" :size="26" class="text-brand" />
    <span class="text-p2 font-semibold text-brand">
      <span class="md:hidden">Choose files to upload</span>
      <span class="hidden md:inline">Drag and drop files here or browse</span>
    </span>
    <span v-if="hint" class="text-p3 font-medium text-secondary">{{ hint }}</span>
  </label>
</template>
