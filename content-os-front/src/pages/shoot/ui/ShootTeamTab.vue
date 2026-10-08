<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { VAvatar } from '@/shared/ui/avatar'
import { VButton } from '@/shared/ui/button'
import { VIcon, type IconName } from '@/shared/ui/icon'
import { VSearch } from '@/shared/ui/search'
import { VSelect } from '@/shared/ui/select'
import {
  roleResponsibilities,
  tasksLabel,
  teamRoleOptions,
  type ShootRoleLabel,
  type TeamCard,
  type teamSummary,
} from '../model/shoot'

// Figma "Shoot / Team": summary, the members as cards and what each role does.
// Add member opens the edit form (the author's only).
// TODO(api): member emails, availability (Active, On set, Available) and the
// card "…" menu — no such data yet.
// TODO(ui): mobile filters sheet.
const { members, total, summary, addTo } = defineProps<{
  members: TeamCard[]
  total: number
  summary: ReturnType<typeof teamSummary>
  addTo: RouteLocationRaw | null
}>()

const search = defineModel<string>('search', { required: true })
const role = defineModel<string>('role', { required: true })

function setRole(value: string | undefined) {
  if (value) role.value = value
}

// Mobile tiles are coloured per metric; desktop ones are all violet (Figma).
const metrics = computed<{ label: string; value: number; icon: IconName; tile: string }[]>(() => [
  {
    label: summary.members === 1 ? 'member' : 'members',
    value: summary.members,
    icon: 'user-group',
    tile: 'bg-status-accent text-link',
  },
  {
    label: summary.creators === 1 ? 'creator' : 'creators',
    value: summary.creators,
    icon: 'user',
    tile: 'bg-status-info text-status-info md:bg-status-accent md:text-link',
  },
  {
    label: 'tasks assigned',
    value: summary.tasks,
    icon: 'file-01',
    tile: 'bg-mint-100 text-mint-400 md:bg-status-accent md:text-link',
  },
  {
    label: summary.mobilographers === 1 ? 'mobilographer' : 'mobilographers',
    value: summary.mobilographers,
    icon: 'camera-01',
    tile: 'bg-status-warning text-orange-400 md:bg-status-accent md:text-link',
  },
])

const roles: { role: ShootRoleLabel; icon: IconName }[] = [
  { role: 'Art Director', icon: 'user' },
  { role: 'Mobilographer', icon: 'camera-01' },
  { role: 'Creator', icon: 'user-group' },
]
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <section
      aria-label="Search and filters"
      class="flex flex-wrap items-center gap-2.5 rounded-2xl bg-card p-4 shadow-[0_8px_32px_4px_rgb(29_42_60/0.05)] md:p-3 md:shadow-none"
    >
      <VSearch
        v-model="search"
        placeholder="Search by member, role, or responsibility…"
        aria-label="Search team"
        class="min-w-0 flex-1 md:min-w-60"
      />
      <VSelect
        :model-value="role"
        :options="teamRoleOptions"
        variant="filter"
        aria-label="Role"
        class="hidden w-[220px] md:block"
        @update:model-value="setRole"
      />
      <VButton v-if="addTo" as-child class="hidden md:inline-flex md:px-5">
        <RouterLink :to="addTo">
          <VIcon name="plus-sign" />
          Add member
        </RouterLink>
      </VButton>
    </section>

    <!-- Mobile: Add member and the role select under the search (Figma). -->
    <div class="flex flex-col gap-3 md:hidden">
      <VButton v-if="addTo" as-child class="h-11 w-full">
        <RouterLink :to="addTo">
          <VIcon name="plus-sign" />
          Add member
        </RouterLink>
      </VButton>
      <VSelect
        :model-value="role"
        :options="teamRoleOptions"
        aria-label="Role"
        @update:model-value="setRole"
      />
    </div>

    <!-- Figma "Card / Team summary". -->
    <section
      aria-labelledby="team-summary"
      class="flex flex-col gap-4 rounded-2xl bg-card p-4 md:p-5"
    >
      <h2 id="team-summary" class="text-h6 text-primary">Team summary</h2>
      <dl class="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <div
          v-for="metric in metrics"
          :key="metric.label"
          class="flex flex-col-reverse gap-3 rounded-xl border border-default p-3 md:flex-row md:items-center md:border-0 md:bg-subtle md:p-4"
        >
          <div class="flex flex-col-reverse gap-1">
            <dt class="text-p3 font-medium text-secondary">{{ metric.label }}</dt>
            <dd class="text-h5 text-primary">{{ metric.value }}</dd>
          </div>
          <span
            :class="[
              'flex size-7 shrink-0 items-center justify-center self-end rounded-lg md:order-first md:size-10 md:self-auto md:rounded-xl',
              metric.tile,
            ]"
          >
            <VIcon :name="metric.icon" :size="20" class="size-4 md:size-5" />
          </span>
        </div>
      </dl>
    </section>

    <!-- Figma "Card / Team members". -->
    <section
      aria-labelledby="team-members"
      class="flex flex-col gap-4 rounded-2xl bg-card p-4 md:p-5"
    >
      <h2 id="team-members" class="text-h6 text-primary">Team members ({{ total }})</h2>
      <ul
        v-if="members.length"
        class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-4"
      >
        <li
          v-for="card in members"
          :key="card.member.id"
          class="flex min-w-0 flex-col gap-4 rounded-xl border border-default p-4"
        >
          <VAvatar :name="card.member.name" :src="card.member.photo_url" :size="44" />
          <div class="flex flex-col gap-1.5">
            <p class="truncate text-p1 font-semibold text-primary">
              {{ card.member.name || 'Unnamed' }}
            </p>
            <p class="text-p3 font-medium text-secondary">{{ card.role }}</p>
          </div>
          <div class="h-px bg-neutral-300" />
          <p class="flex items-center gap-1.5 text-p3 font-medium text-secondary">
            <VIcon name="file-01" :size="16" class="shrink-0" />
            {{ tasksLabel(card) }}
          </p>
          <div class="h-px bg-neutral-300" />
          <div class="flex flex-col gap-3">
            <p class="text-p3 font-medium text-primary">Responsibilities</p>
            <ul class="flex flex-col gap-2">
              <li
                v-for="item in card.responsibilities"
                :key="item"
                class="flex gap-2 text-p3 font-medium text-secondary"
              >
                <span
                  aria-hidden="true"
                  class="mt-1.5 size-1 shrink-0 rounded-full bg-neutral-500"
                />
                {{ item }}
              </li>
            </ul>
          </div>
        </li>
      </ul>
      <p v-else class="py-6 text-center text-p2 font-medium text-secondary">
        No members match the search or role.
      </p>
    </section>

    <!-- Figma "Card / Role responsibilities". -->
    <section
      aria-labelledby="role-responsibilities"
      class="flex flex-col gap-4 rounded-2xl bg-card p-4 md:p-5"
    >
      <h2 id="role-responsibilities" class="text-h6 text-primary">Role responsibilities</h2>
      <ul class="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-3">
        <li
          v-for="item in roles"
          :key="item.role"
          class="flex flex-col gap-4 rounded-xl bg-subtle p-4"
        >
          <p class="flex items-center gap-2.5 text-p1 font-semibold text-primary">
            <VIcon :name="item.icon" :size="20" class="shrink-0 text-link" />
            {{ item.role }}
          </p>
          <ul class="flex flex-col gap-2">
            <li
              v-for="line in roleResponsibilities[item.role].card"
              :key="line"
              class="flex gap-2 text-p3 font-medium text-secondary"
            >
              <span aria-hidden="true" class="mt-1.5 size-1 shrink-0 rounded-full bg-neutral-500" />
              {{ line }}
            </li>
          </ul>
        </li>
      </ul>
    </section>
  </div>
</template>
