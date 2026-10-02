<script setup lang="ts">
import { computed, ref, useAttrs, useId, useTemplateRef, watch, type HTMLAttributes } from 'vue'
import {
  TagsInputInput,
  TagsInputItem,
  TagsInputItemDelete,
  TagsInputItemText,
  TagsInputRoot,
} from 'reka-ui'
import { cn } from '@/shared/lib'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'

defineOptions({ inheritAttrs: false })

// Free-form tags in a field box, on Reka TagsInput. No Figma yet: the box
// follows VInput, the chips follow the accent status. Enter, comma, Tab, paste
// and blur add a tag, as does the + button that shows up while typing;
// Backspace on an empty input selects and removes the last.
const {
  label,
  placeholder,
  error,
  disabled = false,
  max = 0,
  class: className,
} = defineProps<{
  label?: string
  placeholder?: string
  // Error message; a non-empty string switches the field to the error state.
  error?: string
  disabled?: boolean
  // 0 = no limit.
  max?: number
  // Applied to the root wrapper. Other attributes (name, aria-label, …) go
  // to the <input>.
  class?: HTMLAttributes['class']
}>()

const model = defineModel<string[]>({ default: () => [] })

const attrs = useAttrs()
const fallbackId = useId()
const id = computed(() => (attrs.id as string | undefined) ?? fallbackId)
const errorId = computed(() => `${id.value}-error`)

const input = useTemplateRef<{ $el: HTMLInputElement }>('input')
const draft = ref('')

// Reka clears the input after adding a tag without firing `input`.
watch(model, () => {
  draft.value = input.value?.$el.value ?? ''
})

// Same rules as Reka's own add: no duplicates, respects `max`.
function addDraft() {
  const el = input.value?.$el
  const tag = draft.value.trim()
  if (tag && !model.value.includes(tag) && !(max && model.value.length >= max)) {
    if (el) el.value = ''
    draft.value = ''
    model.value = [...model.value, tag]
  }
  el?.focus()
}
</script>

<template>
  <div :class="cn('flex w-full min-w-0 flex-col gap-2', className)">
    <label v-if="label" :for="id" class="text-p3 font-medium text-secondary">
      {{ label }}
    </label>

    <TagsInputRoot
      v-model="model"
      :disabled="disabled"
      :max="max"
      add-on-paste
      add-on-tab
      add-on-blur
      :class="[
        'flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-[10px] px-3 py-2 transition-colors',
        'data-disabled:cursor-not-allowed data-disabled:border-neutral-300 data-disabled:bg-neutral-200',
        error
          ? 'border-[1.5px] border-red-400 bg-red-100'
          : 'border border-default bg-card focus-within:border-violet-400',
        model.length > 0 && 'pl-2',
      ]"
    >
      <TagsInputItem
        v-for="tag in model"
        :key="tag"
        :value="tag"
        class="flex h-7 max-w-full min-w-0 items-center gap-1 rounded-md bg-status-accent pr-1 pl-2.5 text-p3 font-medium text-link outline-none data-[state=active]:ring-1 data-[state=active]:ring-violet-400"
      >
        <TagsInputItemText class="min-w-0 truncate" />
        <TagsInputItemDelete
          :aria-label="`Remove ${tag}`"
          class="flex size-5 shrink-0 items-center justify-center rounded text-link transition-colors hover:bg-violet-200/50 disabled:hidden"
        >
          <VIcon name="multiplication-sign" :size="12" />
        </TagsInputItemDelete>
      </TagsInputItem>

      <TagsInputInput
        ref="input"
        v-bind="attrs"
        :id="id"
        :placeholder="model.length ? undefined : placeholder"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="error ? errorId : undefined"
        class="h-7 min-w-20 flex-1 bg-transparent text-p2 font-medium text-brand outline-none placeholder:text-neutral-600 disabled:cursor-not-allowed"
        @input="draft = ($event.target as HTMLInputElement).value"
      />
      <!-- mousedown.prevent keeps focus in the input, so blur doesn't add the tag first. -->
      <VButton
        v-if="draft.trim() && !disabled"
        variant="soft"
        size="icon-24"
        aria-label="Add tag"
        class="-mr-1"
        @mousedown.prevent
        @click="addDraft"
      >
        <VIcon name="plus-sign" :size="14" />
      </VButton>
    </TagsInputRoot>

    <p v-if="error" :id="errorId" class="text-p3 font-medium text-red-400">
      {{ error }}
    </p>
  </div>
</template>
