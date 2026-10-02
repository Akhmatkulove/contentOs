<script setup lang="ts">
import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'
import { VIcon } from '@/shared/ui/icon'
import {
  chevronClass,
  contentClass,
  itemClass,
  triggerClass,
  type SelectOption,
} from './select-styles'

// Plain dropdown on Reka Select: native-like keyboard (arrows, typeahead,
// Home/End), focus return and scroll lock come from the primitive.
const { options, placeholder, disabled, invalid, triggerAttrs } = defineProps<{
  options: readonly SelectOption[]
  placeholder: string
  disabled: boolean
  invalid: boolean
  triggerAttrs: Record<string, unknown>
}>()

const model = defineModel<string>()
</script>

<template>
  <SelectRoot v-model="model" :disabled="disabled">
    <SelectTrigger
      v-bind="triggerAttrs"
      :class="[triggerClass(invalid), 'data-placeholder:text-neutral-600']"
    >
      <SelectValue :placeholder="placeholder" class="min-w-0 flex-1 truncate" />
      <VIcon name="arrow-down-01-sharp" :size="16" :class="chevronClass" />
    </SelectTrigger>

    <SelectPortal>
      <SelectContent
        position="popper"
        :side-offset="8"
        :class="[
          contentClass,
          'min-w-(--reka-select-trigger-width) [--available-height:var(--reka-select-content-available-height)]',
        ]"
      >
        <SelectViewport class="flex flex-col gap-0.5">
          <SelectItem
            v-for="option in options"
            :key="option.value"
            :value="option.value"
            :disabled="option.disabled"
            :class="itemClass"
          >
            <SelectItemText class="min-w-0 flex-1 truncate">{{ option.label }}</SelectItemText>
            <SelectItemIndicator>
              <VIcon name="tick-01" :size="16" />
            </SelectItemIndicator>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
