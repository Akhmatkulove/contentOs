<script setup lang="ts">
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { useNextShoot } from '../model/shoots-list'

// Figma "Card / Next shoot": the closest upcoming shoot. View all opens the
// Upcoming tab, closest first.
const { shoot, loading } = useNextShoot()
</script>

<template>
  <section
    aria-labelledby="next-shoot"
    class="flex flex-col gap-4 rounded-2xl bg-card px-4 py-5 shadow-[0_8px_16px_rgb(29_42_60/0.05)] md:p-5 md:shadow-none"
  >
    <div class="flex items-center justify-between gap-3">
      <h2 id="next-shoot" class="text-h6 text-primary">Next shoot</h2>
      <RouterLink
        :to="{ name: 'shoots', query: { status: 'upcoming', sort: 'oldest' } }"
        class="flex items-center gap-1.5 text-p3 font-medium text-secondary transition-colors hover:text-brand"
      >
        View all
        <VIcon name="arrow-right-02-sharp" :size="14" />
      </RouterLink>
    </div>

    <template v-if="shoot">
      <div class="flex items-center gap-3">
        <div class="h-[90px] w-18 shrink-0 overflow-hidden rounded-lg bg-muted">
          <img
            v-if="shoot.photoUrl"
            :src="shoot.photoUrl"
            alt=""
            loading="lazy"
            class="size-full object-cover object-top"
          />
        </div>
        <div class="flex min-w-0 flex-col gap-2">
          <p class="text-p2 font-semibold text-primary">{{ shoot.name }}</p>
          <p class="flex items-center gap-1.5 text-p3 font-medium text-secondary">
            <VIcon name="calendar-02" :size="16" class="shrink-0" />
            {{ shoot.date }}
          </p>
          <p
            v-if="shoot.location"
            class="flex min-w-0 items-center gap-1.5 text-p3 font-medium text-secondary"
          >
            <VIcon name="location-01" :size="16" class="shrink-0" />
            <span class="truncate">{{ shoot.location }}</span>
          </p>
        </div>
      </div>
      <VButton as-child class="h-9 w-full md:h-10">
        <RouterLink :to="{ name: 'shoot', params: { id: shoot.id } }">
          Open shoot
          <VIcon name="arrow-right-02-sharp" />
        </RouterLink>
      </VButton>
    </template>
    <!-- TODO(ui): empty state of Next shoot — not in Figma. -->
    <p v-else-if="!loading" class="text-p3 font-medium text-secondary">No upcoming shoots.</p>
  </section>
</template>
