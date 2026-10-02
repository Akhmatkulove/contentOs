<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { VIcon } from '@/shared/ui/icon'
import { tabbarNav } from './nav'

const tabClass =
  'flex flex-1 flex-col items-center justify-center gap-[5px] py-2 text-[11px]/[13px] font-semibold tracking-[0.02em] text-neutral-600 uppercase'
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_rgb(0_0_0/0.06)]"
  >
    <div class="flex h-[60px]">
      <component
        :is="item.to ? RouterLink : 'div'"
        v-for="item in tabbarNav"
        :key="item.label"
        v-bind="item.to ? { to: item.to, exactActiveClass: 'text-violet-400' } : {}"
        :class="tabClass"
      >
        <span class="relative">
          <VIcon :name="item.icon" :size="22" />
          <span
            v-if="item.badge"
            class="absolute -top-[3px] left-3 flex size-3.5 items-center justify-center rounded-full bg-pink-200 text-[7px]/[9px] font-semibold tracking-normal text-violet-500"
          >
            {{ item.badge }}
          </span>
        </span>
        {{ item.label }}
      </component>

      <button type="button" :class="tabClass">
        <VIcon name="more-horizontal" :size="22" />
        More
      </button>
    </div>
  </nav>
</template>
