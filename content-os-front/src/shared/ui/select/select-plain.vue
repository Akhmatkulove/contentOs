<script setup lang="ts">
import { computed } from 'vue'
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
import { type IconName, VIcon } from '@/shared/ui/icon'
import {
  chevronClass,
  contentClass,
  itemClass,
  triggerClass,
  type SelectOption,
  type SelectVariant,
} from './select-styles'

// Plain dropdown on Reka Select: native-like keyboard (arrows, typeahead,
// Home/End), focus return and scroll lock come from the primitive.
const { options, placeholder, disabled, invalid, triggerAttrs, variant, icon, prefix } =
  defineProps<{
    options: readonly SelectOption[]
    placeholder: string
    disabled: boolean
    invalid: boolean
    triggerAttrs: Record<string, unknown>
    variant: SelectVariant
    icon: IconName | undefined
    prefix: string | undefined
  }>()

const model = defineModel<string>()

// Drawn here rather than by Reka's SelectValue: it learns the label only once
// the items have rendered, and the prefix has to sit next to it.
const selectedLabel = computed(() => options.find((option) => option.value === model.value)?.label)
</script>

<template>
  <SelectRoot v-model="model" :disabled="disabled">
    <SelectTrigger
      v-bind="triggerAttrs"
      :class="[triggerClass(invalid, variant), 'data-placeholder:text-neutral-600']"
    >
      <VIcon v-if="icon" :name="icon" :size="16" class="shrink-0 text-brand" />
      <SelectValue :placeholder="placeholder" class="min-w-0 flex-1 truncate">
        {{
          prefix && selectedLabel ? `${prefix} ${selectedLabel}` : (selectedLabel ?? placeholder)
        }}
      </SelectValue>
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
