<script setup lang="ts">
import { computed } from 'vue'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VStatus } from '@/shared/ui/status'
import {
  canAssign,
  displayName,
  sectionsOf,
  STATUS_LABEL,
  STATUS_TONE,
  type DirectoryEntry,
  type LinkSection,
  type ManagedUser,
} from '../model/directory'

const { entry, disabled = false } = defineProps<{
  entry: DirectoryEntry
  disabled?: boolean
}>()

const emit = defineEmits<{
  assign: [section: LinkSection]
  remove: [section: LinkSection, partner: ManagedUser]
}>()

const user = computed(() => entry.user)
const sections = computed(() => sectionsOf(entry))

const initials = computed(() => displayName(user.value).slice(0, 1).toUpperCase())
const joined = computed(() =>
  new Date(user.value.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }),
)
</script>

<template>
  <article class="flex flex-col gap-4 rounded-2xl bg-card p-4 md:p-5">
    <div class="flex items-center gap-3">
      <img
        v-if="user.photo_url"
        :src="user.photo_url"
        alt=""
        class="size-11 shrink-0 rounded-full object-cover"
      />
      <span
        v-else
        aria-hidden="true"
        class="flex size-11 shrink-0 items-center justify-center rounded-full bg-status-accent text-p1 font-semibold text-link"
      >
        {{ initials }}
      </span>

      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <p class="truncate text-p1 font-semibold text-brand">{{ displayName(user) }}</p>
        <p class="truncate text-p3 font-medium text-secondary">
          {{ user.name ? user.email : '' }}
          <span class="hidden md:inline">{{ user.name ? ' · ' : '' }}Joined {{ joined }}</span>
        </p>
      </div>

      <VStatus :tone="STATUS_TONE[user.status]" :size="24">
        {{ STATUS_LABEL[user.status] }}
      </VStatus>
    </div>

    <div
      v-for="section in sections"
      :key="section.kind"
      class="flex flex-col gap-2 border-t border-default pt-3"
    >
      <p class="text-p4 font-medium text-secondary uppercase">{{ section.label }}</p>
      <ul class="flex flex-wrap items-center gap-2">
        <li
          v-for="partner in section.partners"
          :key="partner.id"
          class="flex h-8 items-center gap-1 rounded-full border border-default pr-1 pl-3 text-p3 font-medium text-brand"
        >
          <span class="max-w-48 truncate" :title="partner.email">{{ displayName(partner) }}</span>
          <VButton
            variant="ghost"
            size="icon-24"
            :aria-label="`Remove ${displayName(partner)}`"
            :disabled="disabled"
            @click="emit('remove', section, partner)"
          >
            <VIcon name="multiplication-sign" :size="14" />
          </VButton>
        </li>
        <li v-if="section.partners.length === 0" class="text-p3 font-medium text-tertiary">
          None yet
        </li>
        <li v-if="canAssign(section, user)">
          <VButton variant="soft" size="36" :disabled="disabled" @click="emit('assign', section)">
            <VIcon name="plus-sign" />
            Assign
          </VButton>
        </li>
      </ul>
    </div>
  </article>
</template>
