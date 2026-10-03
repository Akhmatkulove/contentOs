<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ListboxContent,
  ListboxFilter,
  ListboxItem,
  ListboxItemIndicator,
  ListboxRoot,
  useFilter,
} from 'reka-ui'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VModal } from '@/shared/ui/modal'
import { displayName, type ManagedUser } from '../model/directory'

const { owner, noun, candidates } = defineProps<{
  // Who gets the new links: a brand or an art director.
  owner: ManagedUser
  // What is assigned: "art director" or "creator".
  noun: string
  // Approved users of that role not yet linked to the owner.
  candidates: ManagedUser[]
}>()

// Closes with the picked users' ids; nothing when cancelled. The summary
// above the buttons is the confirmation: nothing changes until Assign.
const emit = defineEmits<{ close: [memberIds?: string[]] }>()

// A list right in the modal, not a dropdown: several picks in a row.
// TODO(ui): multi-select in the kit (Figma has none yet) — move this there.
const picked = ref<string[]>([])
const query = ref('')

// Locale-aware, case- and accent-insensitive, as in VSelect.
const { contains } = useFilter({ sensitivity: 'base' })
const filtered = computed(() => {
  const q = query.value.trim()
  if (!q) return candidates
  return candidates.filter((user) => contains(`${user.name ?? ''} ${user.email}`, q))
})

const summary = computed(() => {
  const names = candidates.filter((u) => picked.value.includes(u.id)).map(displayName)
  if (names.length === 0) return ''
  const who = names.length <= 3 ? names.join(', ') : `${names.length} ${noun}s`
  return `${who} will work with ${displayName(owner)}.`
})

const itemClass = [
  'flex h-12 w-full shrink-0 cursor-pointer items-center gap-3 rounded-lg px-2.5 text-p2 font-medium text-brand outline-none select-none',
  'data-highlighted:bg-subtle data-[state=checked]:bg-status-accent',
].join(' ')
</script>

<template>
  <VModal :title="`Assign ${noun}s`" :description="`To ${displayName(owner)}`">
    <ListboxRoot
      v-if="candidates.length"
      v-model="picked"
      multiple
      highlight-on-hover
      class="flex flex-col gap-2"
    >
      <label
        class="flex h-10 shrink-0 cursor-text items-center gap-2 rounded-lg bg-subtle px-2.5 text-secondary"
      >
        <VIcon name="search" :size="16" />
        <ListboxFilter
          v-model="query"
          auto-focus
          placeholder="Search by name or email…"
          aria-label="Search by name or email"
          class="h-full min-w-0 flex-1 bg-transparent text-p2 font-medium text-brand outline-none placeholder:text-secondary"
        />
      </label>

      <!-- The listbox role sits here, so the name goes here too. -->
      <ListboxContent :aria-label="`${noun}s`" class="flex flex-col gap-0.5">
        <ListboxItem v-for="user in filtered" :key="user.id" :value="user.id" :class="itemClass">
          <!-- Checkbox look; the state comes from the Listbox item. -->
          <span
            class="flex size-5 shrink-0 items-center justify-center rounded-md border border-default bg-card text-inverse in-data-[state=checked]:border-transparent in-data-[state=checked]:bg-action-accent"
          >
            <ListboxItemIndicator><VIcon name="tick-01" :size="14" /></ListboxItemIndicator>
          </span>
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="truncate">{{ displayName(user) }}</span>
            <span v-if="user.name" class="truncate text-p3 text-secondary">{{ user.email }}</span>
          </span>
        </ListboxItem>
      </ListboxContent>

      <p
        v-if="filtered.length === 0"
        role="status"
        class="py-3 text-center text-p3 font-medium text-secondary"
      >
        Nothing found
      </p>
    </ListboxRoot>
    <p v-else class="text-p2 font-medium text-secondary">
      Every approved {{ noun }} already works with {{ displayName(owner) }}.
    </p>

    <template #footer>
      <div class="flex flex-col gap-3">
        <p v-if="summary" class="text-p2 font-medium text-secondary">{{ summary }}</p>
        <div class="flex items-center gap-2.5 md:justify-end">
          <VButton
            variant="secondary"
            class="flex-1 md:w-[150px] md:flex-none"
            @click="emit('close')"
          >
            Cancel
          </VButton>
          <VButton
            class="flex-1 md:min-w-[150px] md:flex-none"
            :disabled="picked.length === 0"
            @click="emit('close', picked)"
          >
            {{ picked.length > 1 ? `Assign ${picked.length}` : 'Assign' }}
          </VButton>
        </div>
      </div>
    </template>
  </VModal>
</template>
