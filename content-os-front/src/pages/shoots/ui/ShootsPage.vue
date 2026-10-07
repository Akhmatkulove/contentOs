<script setup lang="ts">
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VNotificationButton } from '@/shared/ui/notification-button'
import { VSearch } from '@/shared/ui/search'
import { VSelect } from '@/shared/ui/select'
import { dateFilterOptions, sortOptions, statusFilterOptions } from '../model/shoot-filters'
import { useShootsList } from '../model/shoots-list'

const { search, status, date, location, sort, locations } = useShootsList()
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <!-- Figma "Topbar" (desktop) and the header of "CMS / Mobile / Topbar". -->
    <header class="flex items-center justify-between gap-4 md:min-h-16">
      <div class="flex min-w-0 flex-col gap-1 md:gap-1.5">
        <h1 class="text-h6 text-brand md:text-h3">Shoots</h1>
        <p class="text-p3 font-medium text-secondary md:hidden">Plan shoots and track your team.</p>
        <p class="hidden text-p2 font-medium text-secondary md:block">
          Plan, track, and manage all content shoots.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <VButton as-child class="hidden md:inline-flex">
          <RouterLink :to="{ name: 'shoot-create' }">
            <VIcon name="plus-sign" />
            New shoot
          </RouterLink>
        </VButton>
        <!-- TODO(ui): mobile topbar in AppLayout (Figma "CMS / Mobile / Topbar"); move the bell there. -->
        <VNotificationButton unread class="lg:hidden" />
      </div>
    </header>

    <!-- Figma "Toolbar": desktop only, the mobile screen has no filters. -->
    <section
      aria-label="Search and filters"
      class="hidden items-center gap-2.5 rounded-2xl bg-card p-3 md:flex"
    >
      <VSearch
        v-model="search"
        placeholder="Search shoots by name, location, or product…"
        aria-label="Search shoots"
        class="min-w-0 flex-1"
      />
      <VSelect
        v-model="status"
        :options="statusFilterOptions"
        variant="filter"
        placeholder="Status"
        aria-label="Status"
        class="w-[136px]"
      />
      <VSelect
        v-model="date"
        :options="dateFilterOptions"
        variant="filter"
        placeholder="Date"
        aria-label="Date"
        class="w-[136px]"
      />
      <VSelect
        v-model="location"
        :options="locations"
        variant="filter"
        placeholder="Location"
        aria-label="Location"
        class="w-[150px]"
      />
      <VSelect
        v-model="sort"
        :options="sortOptions"
        variant="filter"
        placeholder="Sort by"
        aria-label="Sort"
        class="w-[144px]"
      />
    </section>

    <!-- Figma "btn / New shoot" (mobile). -->
    <VButton as-child class="w-full md:hidden">
      <RouterLink :to="{ name: 'shoot-create' }">
        <VIcon name="plus-sign" />
        New shoot
      </RouterLink>
    </VButton>
  </div>
</template>
