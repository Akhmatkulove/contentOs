<script setup lang="ts">
import { computed } from 'vue'
import { deliverablesLabel } from '@/entities/deliverable'
import { VAvatar } from '@/shared/ui/avatar'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VStatus } from '@/shared/ui/status'
import { productsLabel, shootStatuses, type Shoot } from '../model/shoot'

// Figma "Card / Shoot …". From xl a single row: photo, details, progress, team
// and Open shoot, spread over the width: details and progress share the free
// space, team and the button keep their size. Below it the mobile card: status on top, photo and details,
// then team and progress, Open shoot at full width. The wrappers turn into
// `contents` on xl, so their children line up in the row in the `order` given.
const { shoot } = defineProps<{ shoot: Shoot }>()

const status = computed(() => shootStatuses[shoot.status])
// Figma shows three avatars; the rest go into "+N".
const shownTeam = computed(() => shoot.team.slice(0, 3))
const moreTeam = computed(() => shoot.team.length - shownTeam.value.length)
</script>

<template>
  <article
    class="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-[0_8px_16px_rgb(29_42_60/0.05)] xl:flex-row xl:items-center xl:gap-8 xl:shadow-none"
  >
    <VStatus :tone="status.tone" class="self-start xl:hidden">{{ status.label }}</VStatus>

    <div class="flex items-start gap-3 xl:contents">
      <div class="h-[70px] w-14 shrink-0 overflow-hidden rounded-lg bg-muted xl:h-[100px] xl:w-20">
        <img
          v-if="shoot.photoUrl"
          :src="shoot.photoUrl"
          alt=""
          loading="lazy"
          class="size-full object-cover object-top"
        />
      </div>

      <div class="flex min-w-0 flex-1 flex-col gap-2.5 xl:order-2">
        <h3 class="truncate text-p1 font-semibold text-primary">{{ shoot.name }}</h3>
        <div class="flex min-w-0 items-center gap-3.5 text-p3 font-medium text-secondary">
          <span class="flex shrink-0 items-center gap-1.5">
            <VIcon name="calendar-02" :size="16" />
            {{ shoot.date }}
          </span>
          <span v-if="shoot.location" class="flex min-w-0 items-center gap-1.5">
            <VIcon name="location-01" :size="16" class="shrink-0" />
            <span class="truncate">{{ shoot.location }}</span>
          </span>
        </div>
        <div class="flex items-center gap-3.5 text-p3 font-medium text-secondary">
          <span class="flex items-center gap-1.5">
            <VIcon name="image-01" :size="16" />
            {{ productsLabel(shoot.products) }}
          </span>
          <span class="flex items-center gap-1.5">
            <VIcon name="file-01" :size="16" />
            {{ deliverablesLabel(shoot.deliverables) }}
          </span>
        </div>
      </div>
    </div>

    <div class="flex items-start gap-6 xl:contents">
      <div class="flex shrink-0 flex-col gap-1 xl:order-4 xl:w-[110px] xl:gap-2">
        <p class="text-p4 font-medium text-secondary">Team</p>
        <ul
          :aria-label="`${shoot.name} team`"
          class="flex items-center -space-x-[7px] xl:gap-1.5 xl:space-x-0"
        >
          <li v-for="member in shownTeam" :key="member.id" :title="member.name ?? undefined">
            <VAvatar :name="member.name" :src="member.photo_url" :size="24" />
          </li>
          <li
            v-if="moreTeam"
            class="flex size-6 shrink-0 items-center justify-center rounded-full bg-status-accent text-p4 font-medium text-link"
          >
            +{{ moreTeam }}
          </li>
        </ul>
      </div>

      <div class="flex min-w-0 flex-1 flex-col gap-3 xl:order-3 xl:max-w-60">
        <VStatus :tone="status.tone" class="hidden self-start xl:inline-flex">
          {{ status.label }}
        </VStatus>
        <div class="flex items-center justify-between">
          <span class="text-p2 font-semibold text-primary">{{ shoot.percent }}%</span>
          <span class="text-p3 font-medium text-secondary">
            {{ shoot.approved }} / {{ shoot.deliverables }}
          </span>
        </div>
        <div
          role="progressbar"
          :aria-valuenow="shoot.percent"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="Deliverables approved"
          class="h-1.5 overflow-hidden rounded-full bg-neutral-300"
        >
          <div
            class="h-full rounded-full bg-action-accent"
            :style="{ width: `${shoot.percent}%` }"
          />
        </div>
      </div>
    </div>

    <VButton variant="secondary" as-child class="h-9 w-full xl:order-5 xl:h-10 xl:w-auto xl:px-5">
      <RouterLink :to="{ name: 'shoot', params: { id: shoot.id } }">
        Open shoot
        <VIcon name="arrow-right-02-sharp" />
      </RouterLink>
    </VButton>
  </article>
</template>
