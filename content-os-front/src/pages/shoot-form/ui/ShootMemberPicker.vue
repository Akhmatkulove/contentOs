<script setup lang="ts">
import { VAvatar } from '@/shared/ui/avatar'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VListPicker } from '@/shared/ui/list-picker'
import type { TeamMember } from '../model/shoot-draft'

// Figma "Selected creators": chips and the add button in one pill box. Used for
// creators and mobilographers alike: either takes any number of people.
const { members, options, label, addText, noun, emptyText } = defineProps<{
  members: TeamMember[]
  options: TeamMember[]
  label: string
  addText: string
  // Lowercase, for "Remove creator" when the person has no name.
  noun: string
  emptyText: string
}>()

const selected = defineModel<string[]>({ required: true })

function toggle(id: string) {
  selected.value = selected.value.includes(id)
    ? selected.value.filter((value) => value !== id)
    : [...selected.value, id]
}

const memberName = (member: TeamMember) => member.name ?? ''
</script>

<template>
  <ul class="flex min-h-11 flex-wrap items-center gap-2 rounded-3xl border border-default p-1.5">
    <li
      v-for="member in members"
      :key="member.id"
      class="flex h-9 min-w-0 items-center gap-1.5 rounded-full bg-subtle pr-3 pl-1.5"
    >
      <VAvatar :name="member.name" :src="member.photo_url" :size="24" />
      <span class="truncate text-p3 font-medium text-primary">{{ member.name || 'Unnamed' }}</span>
      <!-- 12px like Figma; ::after widens the tap area to 28px. -->
      <VButton
        variant="ghost"
        size="icon-24"
        :aria-label="`Remove ${member.name || noun}`"
        class="relative size-3 shrink-0 text-secondary after:absolute after:-inset-2 hover:text-primary"
        @click="toggle(member.id)"
      >
        <VIcon name="multiplication-sign" :size="12" />
      </VButton>
    </li>
    <!-- Mobile: its own full-width row under the chips. -->
    <li class="flex basis-full md:basis-auto">
      <VListPicker
        :items="options"
        :selected="selected"
        :text="memberName"
        multiple
        :label="label"
        :empty-text="emptyText"
        @toggle="toggle"
      >
        <template #item="{ item }">
          <VAvatar :name="item.name" :src="item.photo_url" :size="24" />
          <span class="min-w-0 flex-1 truncate">{{ item.name || 'Unnamed' }}</span>
        </template>
        <VButton variant="soft" size="36" class="flex-1 md:h-8.5 md:px-5">
          <VIcon name="plus-sign" />
          {{ addText }}
        </VButton>
      </VListPicker>
    </li>
  </ul>
</template>
