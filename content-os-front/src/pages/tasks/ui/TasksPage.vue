<script setup lang="ts">
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { NotificationBell } from '@/widgets/notification-bell'
import { useTasksView } from '../model/tasks-view'
import BrandDeliverables from './BrandDeliverables.vue'
import ShootTasks from './ShootTasks.vue'

const { artDirector, view, views } = useTasksView()
</script>

<!--
  My tasks (docs/adr/0011). The art director also has a backlog, Brand
  deliverables (docs/adr/0019): what brands assigned to them and whether a shoot
  closes it yet. It has no Figma frame yet: a switch over the list.
-->
<template>
  <div class="flex flex-col gap-4">
    <!-- Figma "Topbar" (desktop) and the header of "CMS / Mobile / Topbar". -->
    <header class="flex items-center justify-between gap-4 md:min-h-16">
      <div class="flex min-w-0 flex-col gap-1">
        <h1 class="text-h6 text-brand md:text-h3">My tasks</h1>
        <p class="text-p3 font-medium text-secondary md:text-p2">
          <template v-if="artDirector">
            <span class="md:hidden">Review deliverables and keep shoots moving.</span>
            <span class="hidden md:inline">
              Review assigned deliverables, give feedback, and keep shoots moving.
            </span>
          </template>
          <template v-else
            >Your assigned tasks, deliverables and deadlines. Keep creating ✨</template
          >
        </p>
      </div>

      <div class="flex items-center gap-3">
        <VButton v-if="artDirector" as-child size="44" class="hidden md:inline-flex">
          <RouterLink :to="{ name: 'shoots' }">
            <VIcon name="plus-sign" />
            Add deliverable
          </RouterLink>
        </VButton>
        <!-- TODO(ui): mobile topbar in AppLayout (Figma "CMS / Mobile / Topbar"); move the bell there. -->
        <NotificationBell class="lg:hidden" />
      </div>
    </header>

    <!-- TODO(ui): the switch has no Figma frame yet. -->
    <nav
      v-if="artDirector"
      aria-label="My tasks"
      class="flex gap-1 self-start rounded-full bg-card p-1"
    >
      <RouterLink
        v-for="item in views"
        :key="item.value"
        :to="item.to"
        :aria-current="view === item.value ? 'page' : undefined"
        :class="[
          'flex h-8 items-center rounded-full px-3.5 text-p3 font-medium whitespace-nowrap transition-colors',
          view === item.value ? 'bg-inverse text-inverse' : 'text-secondary hover:text-primary',
        ]"
      >
        {{ item.label }}
        <!-- The not scheduled ones, in the look of the menu's badge (docs/adr/0023). -->
        <span
          v-if="item.badge"
          class="ml-1.5 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-pink-200 px-1.5 text-[11px]/[14px] font-semibold text-violet-500 tabular-nums"
        >
          {{ item.badge }}<span class="sr-only"> not scheduled</span>
        </span>
      </RouterLink>
    </nav>

    <BrandDeliverables v-if="view === 'brand'" />
    <ShootTasks v-else />
  </div>
</template>
