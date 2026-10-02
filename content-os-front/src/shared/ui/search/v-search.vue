<script setup lang="ts">
import { ref, watch, type HTMLAttributes } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { cn } from '@/shared/lib'
import { VIcon } from '@/shared/ui/icon'

defineOptions({ inheritAttrs: false })

const { debounce = 300, class: className } = defineProps<{
  // Delay in ms between the last keystroke and the model update.
  debounce?: number
  // Applied to the root wrapper. Other attributes (placeholder, disabled,
  // aria-label, …) go to the <input>.
  class?: HTMLAttributes['class']
}>()

// The model holds the trimmed query and changes only after the debounce,
// so it can go straight into a query key.
const model = defineModel<string>({ default: '' })

// What the user sees while typing; the model catches up with it.
const draft = ref(model.value)

function commit() {
  const query = draft.value.trim()
  if (query !== model.value) model.value = query
}

const commitLater = useDebounceFn(commit, () => debounce)

watch(draft, (value) => {
  // Clearing the field shows the full list right away.
  if (value.trim() === '') commit()
  else commitLater()
})

// A reset from outside (route change, "clear filters") updates the field.
watch(model, (value) => {
  if (value !== draft.value.trim()) draft.value = value
})
</script>

<template>
  <label
    :class="
      cn(
        'flex h-8 w-full cursor-text items-center gap-2 rounded-[20px] border border-transparent bg-neutral-200 px-3.5 text-neutral-600 transition-colors md:h-10 md:bg-neutral-100 md:pr-3',
        'focus-within:border-violet-400 has-[input:disabled]:cursor-not-allowed has-[input:disabled]:text-neutral-500',
        className,
      )
    "
  >
    <VIcon name="search" :size="14" />
    <input
      aria-label="Search"
      v-bind="$attrs"
      v-model="draft"
      type="search"
      enterkeyhint="search"
      autocomplete="off"
      class="h-full w-full min-w-0 flex-1 appearance-none bg-transparent text-p3 font-medium text-violet-500 outline-none placeholder:text-neutral-600 disabled:cursor-not-allowed disabled:placeholder:text-neutral-500 [&::-webkit-search-cancel-button]:appearance-none"
      @keydown.enter="commit"
    />
  </label>
</template>
