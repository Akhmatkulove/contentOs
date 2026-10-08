<script setup lang="ts">
import { computed } from 'vue'
import { VAvatar } from '@/shared/ui/avatar'
import { VButton } from '@/shared/ui/button'
import { VDropdownMenu, VDropdownMenuItem } from '@/shared/ui/dropdown-menu'
import { VIcon } from '@/shared/ui/icon'
import type { ShootNote } from '../api/notes'
import { noteDate, noteLines } from '../model/notes'

// Figma "Card / <note>": title, author and date, the text as a list. The "…"
// menu (Edit, Pin, Delete) is the author's and the art director's.
const { note } = defineProps<{ note: ShootNote }>()

const emit = defineEmits<{ edit: []; pin: []; remove: [] }>()

const lines = computed(() => noteLines(note.body))
</script>

<template>
  <article
    class="flex min-w-0 flex-col gap-4 rounded-2xl bg-card p-4 shadow-[0_8px_16px_rgb(29_42_60/0.05)] md:p-6 md:shadow-none"
  >
    <span
      v-if="note.pinned"
      class="flex items-center gap-1.5 self-start rounded-lg bg-status-accent px-2 py-1.5 text-p4 font-medium text-link"
    >
      <VIcon name="pin" :size="14" />
      Pinned
    </span>

    <div class="flex items-start justify-between gap-3">
      <h3 class="text-h5 break-words text-primary">{{ note.title }}</h3>
      <VDropdownMenu v-if="note.can_manage" align="end" content-class="w-40">
        <template #trigger>
          <VButton
            variant="ghost"
            size="icon-32"
            :aria-label="`${note.title} actions`"
            class="shrink-0 text-secondary data-[state=open]:bg-status-accent"
          >
            <VIcon name="more-horizontal" :size="16" />
          </VButton>
        </template>
        <VDropdownMenuItem @select="emit('edit')">Edit</VDropdownMenuItem>
        <VDropdownMenuItem @select="emit('pin')">{{
          note.pinned ? 'Unpin' : 'Pin'
        }}</VDropdownMenuItem>
        <VDropdownMenuItem class="text-red-400" @select="emit('remove')">Delete</VDropdownMenuItem>
      </VDropdownMenu>
    </div>

    <p class="flex items-center gap-2 text-p3 font-medium text-secondary">
      <VAvatar :name="note.author.name" :src="note.author.photo_url" :size="28" />
      {{ note.author.name || 'Unnamed' }} · {{ noteDate(note.created_at) }}
    </p>

    <ul class="flex flex-col gap-2">
      <li
        v-for="(line, index) in lines"
        :key="index"
        class="flex gap-2.5 text-p2 font-medium break-words text-secondary"
      >
        <span aria-hidden="true" class="mt-2 size-1 shrink-0 rounded-full bg-neutral-500" />
        {{ line }}
      </li>
    </ul>

    <p
      v-if="note.assignees.length"
      class="flex flex-wrap items-center gap-2 text-p3 font-medium text-secondary"
    >
      <span>For</span>
      <span
        v-for="member in note.assignees"
        :key="member.id"
        class="flex items-center gap-1.5 rounded-full bg-subtle py-1 pr-2.5 pl-1 text-primary"
      >
        <VAvatar :name="member.name" :src="member.photo_url" :size="24" />
        {{ member.name || 'Unnamed' }}
      </span>
    </p>
  </article>
</template>
