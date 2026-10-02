<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/entities/session'
import { VIcon } from '@/shared/ui/icon'
import logoMarkUrl from './assets/logo-mark-dark.svg'
import logoTextUrl from './assets/logo-text-dark.svg'
import { isNavItemActive, roleLabels, useNav, type NavItem } from './nav'

const session = useSessionStore()
const nav = useNav()
const router = useRouter()
const route = useRoute()

const isActive = (item: NavItem) => isNavItemActive(router, item, route)

const name = computed(() => session.me?.name ?? '')
const role = computed(() => (session.me?.role ? roleLabels[session.me.role] : ''))
const initial = computed(() => name.value.charAt(0).toUpperCase())
</script>

<template>
  <aside class="fixed inset-y-4 left-4 hidden w-60 flex-col rounded-xl bg-white lg:flex">
    <div class="flex shrink-0 items-center gap-[7px] px-[28px] pt-[26px] pb-[31px]">
      <img :src="logoMarkUrl" alt="" class="h-[13.82px] w-[13.494px]" />
      <img :src="logoTextUrl" alt="Creator Lab" class="h-[14.049px] w-[99.14px]" />
    </div>

    <!-- Only the links scroll; the logo and the profile block stay put. -->
    <nav
      class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-[15px] pt-3 pb-4"
    >
      <RouterLink
        v-for="item in nav.sidebar"
        :key="item.label"
        :to="item.to"
        :class="[
          'flex h-11 shrink-0 items-center gap-[15px] rounded-[11px] px-5 text-p2 font-semibold text-neutral-800 uppercase',
          isActive(item) && 'bg-neutral-200',
        ]"
      >
        <VIcon :name="item.icon" :size="18" class="text-violet-500" />
        <span class="flex-1">{{ item.label }}</span>
        <span
          v-if="item.badge"
          class="flex size-[22px] items-center justify-center rounded-full bg-pink-200 text-[11px]/[14px] font-semibold text-violet-500"
        >
          {{ item.badge }}
        </span>
      </RouterLink>
    </nav>

    <div class="flex shrink-0 flex-col gap-4 px-[15px] py-4">
      <div class="h-px bg-neutral-300" />
      <div class="flex items-center gap-2.5 rounded-xl bg-neutral-100 py-2 pr-2.5 pl-2">
        <img
          v-if="session.me?.photo_url"
          :src="session.me.photo_url"
          alt=""
          class="size-[34px] shrink-0 rounded-full object-cover"
        />
        <div
          v-else
          class="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-violet-100 text-p3 font-semibold text-violet-400"
        >
          {{ initial }}
        </div>

        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
          <p class="truncate text-p2 font-semibold text-neutral-800">{{ name }}</p>
          <p class="truncate text-p3 font-medium text-neutral-600">{{ role }}</p>
        </div>

        <button type="button" aria-label="Profile menu" class="text-neutral-600">
          <VIcon name="more-horizontal" :size="18" />
        </button>
      </div>
    </div>
  </aside>
</template>
