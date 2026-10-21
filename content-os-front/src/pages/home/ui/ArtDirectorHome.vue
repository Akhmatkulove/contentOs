<script setup lang="ts">
import { ProductActionsMenu } from '@/features/product-actions'
import { useSessionStore } from '@/entities/session'
import { VAvatar } from '@/shared/ui/avatar'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VStatus } from '@/shared/ui/status'
import { NotificationBell } from '@/widgets/notification-bell'
import { useArtDirectorHome } from '../model/art-director-home'
import HomeCard from './HomeCard.vue'
import HomeEmpty from './HomeEmpty.vue'
import HomeTile from './HomeTile.vue'
import KpiCard from './KpiCard.vue'

// Figma "SCREEN:h_ad Art Director view" and its mobile state. Desktop: KPIs,
// then shoots, products and team on the left, tasks and activity on the right.
// Mobile: one column, tasks right after the shoots, activity after the
// products; the columns turn into `contents` there, so `order` places their
// cards in it.
const session = useSessionStore()
const {
  title,
  today,
  kpi,
  shoots,
  shootsLoaded,
  products,
  productsLoaded,
  tasks,
  tasksLoaded,
  activity,
  activityLoaded,
  team,
} = useArtDirectorHome()

// Mobile: a sideways row, two tiles and a peek of the next; md and up: four in a row.
const tilesClass =
  'scrollbar-none relative -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0'
// The task and activity lists show about five rows and scroll for the rest.
const listClass = 'flex max-h-[249px] flex-col gap-2 overflow-y-auto pr-4'
const rowClass =
  'flex h-[45px] items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-inset'
</script>

<template>
  <div class="flex flex-col gap-4 lg:gap-5">
    <!-- Figma "CMS / Mobile / Topbar" with the greeting as the title. -->
    <header class="flex items-center justify-between gap-4 lg:hidden">
      <div class="flex min-w-0 items-center gap-2">
        <VAvatar :name="session.me?.name ?? null" :src="session.me?.photo_url ?? null" :size="48" />
        <div class="flex min-w-0 flex-col gap-1">
          <h1 class="truncate text-h6 text-primary">{{ title }}</h1>
          <p class="text-p3 font-medium text-secondary">
            Here's what's happening with your content.
          </p>
        </div>
      </div>
      <NotificationBell />
    </header>

    <header class="hidden items-center justify-between gap-6 lg:flex">
      <div class="flex min-w-0 flex-col gap-1">
        <h1 class="truncate text-h3 text-primary">{{ title }}</h1>
        <p class="text-p2 font-medium text-secondary">Here's what's happening with your content.</p>
      </div>
      <div class="flex shrink-0 items-center gap-3">
        <p class="text-p2 font-medium text-secondary">{{ today }}</p>
        <NotificationBell />
        <VButton as-child size="44">
          <RouterLink :to="{ name: 'shoot-create' }">
            <VIcon name="plus-sign" />
            New shoot
          </RouterLink>
        </VButton>
      </div>
    </header>

    <div class="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
      <KpiCard
        :value="kpi.activeProducts"
        label="Active products"
        icon="package"
        chip-class="bg-status-accent text-link"
      />
      <KpiCard
        :value="kpi.shootsInProgress"
        label="Shoots in progress"
        icon="camera-01"
        chip-class="bg-status-warning text-orange-400"
      />
      <KpiCard
        :value="kpi.deliverablesThisMonth"
        label="Deliverables this month"
        icon="image-02"
        chip-class="bg-mint-100 text-mint-400"
      />
      <!-- TODO(api): Total views this month — no view statistics at all. -->
    </div>

    <VButton as-child class="w-full lg:hidden">
      <RouterLink :to="{ name: 'shoot-create' }">
        <VIcon name="plus-sign" />
        New shoot
      </RouterLink>
    </VButton>

    <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:gap-5">
      <div class="contents xl:flex xl:min-w-0 xl:flex-1 xl:flex-col xl:gap-5">
        <HomeCard title="Recent shoots" :to="{ name: 'shoots' }" bare class="order-1 xl:order-none">
          <ul v-if="shoots.length" :class="tilesClass">
            <li v-for="shoot in shoots" :key="shoot.id" class="contents">
              <HomeTile
                :title="shoot.name"
                :subtitle="shoot.meta"
                :photo-url="shoot.photoUrl"
                :to="{ name: 'shoot', params: { id: shoot.id } }"
                :progress="{
                  done: shoot.approved,
                  total: shoot.deliverables,
                  percent: shoot.percent,
                }"
              >
                <template #badge>
                  <VStatus
                    :tone="shoot.status.tone"
                    :size="24"
                    class="absolute bottom-2.5 left-2.5"
                  >
                    {{ shoot.status.label }}
                  </VStatus>
                </template>
              </HomeTile>
            </li>
          </ul>
          <HomeEmpty
            v-else-if="shootsLoaded"
            title="No shoots yet"
            text="Create your first shoot to start planning content and tracking progress."
          />
          <!-- TODO(ui): navigation dots under the mobile row (Figma "Navigation Dots"). -->
        </HomeCard>

        <HomeCard title="Products" :to="{ name: 'products' }" bare class="order-3 xl:order-none">
          <ul v-if="products.length" :class="tilesClass">
            <li v-for="product in products" :key="product.id" class="contents">
              <HomeTile
                :title="product.name"
                :subtitle="product.collection"
                :photo-url="product.photoUrl"
                :to="{ name: 'product', params: { id: product.id } }"
                :progress="
                  product.deliverables
                    ? {
                        done: product.approved,
                        total: product.deliverables,
                        percent: product.percent,
                      }
                    : undefined
                "
              >
                <template #badge>
                  <ProductActionsMenu :product="product" :can-edit="false">
                    <template #trigger>
                      <VButton
                        variant="surface"
                        size="icon-24"
                        :aria-label="`${product.name} actions`"
                        class="absolute top-2.5 right-2.5 z-10 size-[26px] opacity-92 data-[state=open]:inset-ring-[1.5px] data-[state=open]:inset-ring-violet-400"
                      >
                        <VIcon name="more-horizontal" :size="14" />
                      </VButton>
                    </template>
                  </ProductActionsMenu>
                </template>
              </HomeTile>
            </li>
          </ul>
          <HomeEmpty
            v-else-if="productsLoaded"
            title="No products yet"
            text="Add products to organize your shoots and content."
          />
          <!-- TODO(ui): navigation dots under the mobile row (Figma "Navigation Dots"). -->
        </HomeCard>

        <HomeCard title="Team" class="order-6 xl:order-none">
          <ul class="flex flex-wrap gap-2.5">
            <li
              v-for="member in team"
              :key="member.id"
              class="flex items-center gap-2 rounded-full bg-subtle py-1.5 pr-3.5 pl-1.5"
            >
              <VAvatar :name="member.name" :src="member.photoUrl" :size="32" />
              <div class="flex flex-col gap-0.5 whitespace-nowrap">
                <p class="text-table font-semibold text-primary">{{ member.name }}</p>
                <p class="text-p4 font-medium text-secondary">{{ member.role }}</p>
              </div>
            </li>
            <!-- TODO(api): Invite — creators are linked to an art director only in the admin panel. -->
          </ul>
          <!-- TODO(api): Manage team — no team management for the art director. -->
        </HomeCard>
      </div>

      <div class="contents xl:flex xl:w-[384px] xl:shrink-0 xl:flex-col xl:gap-5">
        <HomeCard title="My tasks" :to="{ name: 'tasks' }" class="order-2 xl:order-none">
          <ul v-if="tasks.length" :class="listClass" aria-label="Top tasks">
            <li v-for="task in tasks" :key="task.id">
              <RouterLink
                :to="{ name: task.review ? 'task-review' : 'task', params: { id: task.id } }"
                :class="[rowClass, 'gap-3']"
              >
                <span
                  v-if="task.done"
                  class="flex size-5 shrink-0 items-center justify-center rounded-[10px] bg-mint-100 text-mint-400"
                >
                  <VIcon name="tick-01" :size="12" />
                  <span class="sr-only">Done:</span>
                </span>
                <span
                  v-else
                  aria-hidden="true"
                  class="size-5 shrink-0 rounded-[10px] border-[1.5px] border-strong"
                />
                <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span class="truncate text-table font-semibold text-primary">{{
                    task.name
                  }}</span>
                  <span class="truncate text-p4 font-medium text-secondary">{{
                    task.product
                  }}</span>
                </span>
              </RouterLink>
            </li>
          </ul>
          <HomeEmpty
            v-else-if="tasksLoaded"
            title="You’re all caught up"
            text="New tasks will appear here."
          />
        </HomeCard>

        <HomeCard title="Latest activity" :to="{ name: 'activity' }" class="order-4 xl:order-none">
          <ul v-if="activity.length" :class="listClass" aria-label="Latest activity">
            <li v-for="event in activity" :key="event.id">
              <RouterLink :to="event.to" :class="[rowClass, 'gap-2.5']">
                <VAvatar
                  v-if="event.actor"
                  :name="event.actor.name"
                  :src="event.actor.photoUrl"
                  :size="32"
                />
                <span
                  v-else
                  aria-hidden="true"
                  class="flex size-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-400"
                >
                  <VIcon name="tick-01" :size="16" />
                </span>
                <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span class="truncate text-table font-semibold text-primary">{{
                    event.title
                  }}</span>
                  <span class="truncate text-p4 font-medium text-secondary">{{
                    event.detail
                  }}</span>
                </span>
                <span class="shrink-0 text-p4 font-medium text-tertiary">{{ event.time }}</span>
              </RouterLink>
            </li>
          </ul>
          <HomeEmpty
            v-else-if="activityLoaded"
            title="No activity yet"
            text="Updates from your team will appear here."
          />
        </HomeCard>
      </div>
    </div>
  </div>
</template>
