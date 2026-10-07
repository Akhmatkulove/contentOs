<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ListboxContent,
  ListboxFilter,
  ListboxItem,
  ListboxItemIndicator,
  ListboxRoot,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
  useFilter,
} from 'reka-ui'
import { VAvatar } from '@/shared/ui/avatar'
import { VIcon } from '@/shared/ui/icon'
import { selectContentClass, selectItemClass } from '@/shared/ui/select'
import type { TeamMember } from '../model/shoot-draft'

// People picker of "Card / Team" (not in Figma yet: styled as the select
// dropdowns). The trigger comes from the slot. `multiple` keeps the list open
// and ticks people on and off (creators); otherwise one pick closes it
// (mobilographer). The picker only reports what was clicked: the form decides.
const {
  members,
  selected,
  multiple = false,
  label,
  loading = false,
} = defineProps<{
  members: TeamMember[]
  selected: string[]
  multiple?: boolean
  // Names the list for screen readers: "Creators", "Mobilographer".
  label: string
  loading?: boolean
}>()

const emit = defineEmits<{ toggle: [id: string] }>()

const open = ref(false)
const query = ref('')

const { contains } = useFilter({ sensitivity: 'base' })
const filtered = computed(() => {
  const q = query.value.trim()
  return q ? members.filter((member) => contains(member.name ?? '', q)) : members
})

// A fresh search every time the list opens.
watch(open, (isOpen) => {
  if (!isOpen) query.value = ''
})

// Listbox reports the whole new selection; the form wants the one id clicked.
function onChange(value: unknown) {
  const next = Array.isArray(value) ? (value as string[]) : value ? [value as string] : []
  const clicked =
    next.find((id) => !selected.includes(id)) ?? selected.find((id) => !next.includes(id))
  if (clicked) emit('toggle', clicked)
  if (!multiple) open.value = false
}

const emptyText = computed(() => {
  if (loading) return 'Loading your team…'
  if (members.length === 0) return 'No one left to add. An admin adds creators to your team.'
  return 'No one found'
})
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <slot :open="open" />
    </PopoverTrigger>

    <PopoverPortal>
      <PopoverContent
        align="start"
        :side-offset="8"
        :collision-padding="16"
        :class="[
          selectContentClass,
          'w-72 [--available-height:var(--reka-popover-content-available-height)]',
        ]"
      >
        <ListboxRoot
          :model-value="multiple ? selected : selected[0]"
          :multiple="multiple"
          :selection-behavior="multiple ? 'toggle' : 'replace'"
          highlight-on-hover
          :aria-label="label"
          class="flex min-h-0 flex-col gap-0.5"
          @update:model-value="onChange"
        >
          <label
            class="flex h-10 shrink-0 cursor-text items-center gap-2 rounded-lg bg-subtle px-2.5 text-secondary"
          >
            <VIcon name="search" :size="16" />
            <ListboxFilter
              v-model="query"
              auto-focus
              placeholder="Search by name…"
              aria-label="Search by name"
              class="h-full min-w-0 flex-1 bg-transparent text-p2 font-medium text-brand outline-none placeholder:text-secondary"
            />
          </label>

          <ListboxContent
            v-if="filtered.length"
            class="flex min-h-0 flex-col gap-0.5 overflow-y-auto overscroll-contain"
          >
            <ListboxItem
              v-for="member in filtered"
              :key="member.id"
              :value="member.id"
              :class="selectItemClass"
            >
              <VAvatar :name="member.name" :src="member.photo_url" :size="24" />
              <span class="min-w-0 flex-1 truncate">{{ member.name || 'Unnamed' }}</span>
              <ListboxItemIndicator><VIcon name="tick-01" :size="16" /></ListboxItemIndicator>
            </ListboxItem>
          </ListboxContent>

          <p v-else role="status" class="px-2 py-3 text-center text-p3 font-medium text-secondary">
            {{ emptyText }}
          </p>
        </ListboxRoot>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
