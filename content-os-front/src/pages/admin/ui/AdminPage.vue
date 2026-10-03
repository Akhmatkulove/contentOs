<script setup lang="ts">
import { useLogout } from '@/features/logout'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VSearch } from '@/shared/ui/search'
import { VSegmented } from '@/shared/ui/segmented'
import { useAdminDirectory } from '../model/admin-directory'
import UserCard from './UserCard.vue'

// No Figma design yet: built from the existing kit on the product's tokens.
const {
  tab,
  tabOptions,
  search,
  entries,
  isLoading,
  failed,
  retry,
  saving,
  openAssign,
  confirmRemove,
} = useAdminDirectory()
const { logout, loggingOut } = useLogout()
</script>

<template>
  <main class="min-h-dvh bg-canvas px-4 py-6 md:px-8 md:py-10">
    <div class="mx-auto flex w-full max-w-[1040px] flex-col gap-4 md:gap-5">
      <header class="flex items-center justify-between gap-4 md:min-h-16">
        <div class="flex min-w-0 flex-col gap-1 md:gap-1.5">
          <h1 class="text-h6 text-brand md:text-h3">Users</h1>
          <p class="text-p3 font-medium text-secondary md:text-p2">
            Brands, art directors and creators, and who works with whom
          </p>
        </div>
        <VButton variant="secondary" size="36" :disabled="loggingOut" @click="logout">
          <VIcon name="logout-square-01" />
          Log out
        </VButton>
      </header>

      <section
        aria-label="Filters"
        class="flex flex-col gap-3 rounded-2xl bg-card p-4 md:flex-row md:items-center md:p-3"
      >
        <!-- Segments share the width equally, so the track is wide enough for the
             longest label; on a phone it scrolls sideways. -->
        <div class="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <VSegmented v-model="tab" :options="tabOptions" aria-label="Role" class="w-[600px]" />
        </div>
        <VSearch
          v-model="search"
          placeholder="Search by name or email…"
          aria-label="Search users"
          class="w-auto min-w-0 flex-1"
        />
      </section>

      <p v-if="isLoading" class="py-10 text-center text-p2 font-medium text-secondary">Loading…</p>

      <div v-else-if="failed" role="alert" class="flex flex-col items-center gap-3 py-10">
        <p class="text-p2 font-medium text-secondary">Couldn’t load users.</p>
        <VButton variant="secondary" size="36" @click="retry">Try again</VButton>
      </div>

      <p
        v-else-if="entries.length === 0"
        class="py-10 text-center text-p2 font-medium text-secondary"
      >
        {{ search ? 'Nobody matches the search.' : 'Nobody here yet.' }}
      </p>

      <ul v-else class="flex flex-col gap-3" :aria-busy="saving">
        <li v-for="entry in entries" :key="entry.user.id">
          <UserCard
            :entry="entry"
            :disabled="saving"
            @assign="(section) => openAssign(entry, section)"
            @remove="(section, partner) => confirmRemove(entry, section, partner)"
          />
        </li>
      </ul>
    </div>
  </main>
</template>
