<script setup lang="ts">
import { computed } from 'vue'
import { deliverablesLabel, deliverableStatuses } from '@/entities/deliverable'
import { progressPercent, type ShootDetails } from '@/entities/shoot'
import { toReference } from '@/entities/reference'
import { VAvatar } from '@/shared/ui/avatar'
import { VIcon, type IconName } from '@/shared/ui/icon'
import { VStatus } from '@/shared/ui/status'
import { VThumbnail } from '@/shared/ui/thumbnail'
import type { ShootProduct } from '../model/products-tab'
import type { DeliverableCounts, ShootPerson, coverPhotos, shootFacts } from '../model/shoot'
import ProgressBar from './ProgressBar.vue'

// Figma "Shoot / Overview": covers, creative direction, products, progress,
// details and team.
// TODO(api): Add cover, Shoot description, Goals, Files and Add member — the
// shoot has no such fields yet; they come with their own step.
const { shoot, products, people, counts, covers, facts } = defineProps<{
  shoot: ShootDetails
  products: ShootProduct[]
  people: ShootPerson[]
  counts: DeliverableCounts
  covers: ReturnType<typeof coverPhotos>
  facts: ReturnType<typeof shootFacts>
}>()

const percent = computed(() => progressPercent(counts.approved, counts.total))

// Figma's chips under the bar, plus In progress: every status adds up to the total.
const summary = [
  'approved',
  'in_progress',
  'needs_review',
  'needs_changes',
  'to_shoot',
] as const satisfies (keyof DeliverableCounts)[]

const details = computed<{ label: string; value: string; icon: IconName }[]>(() => [
  { label: 'Date', value: facts.date, icon: 'calendar-02' },
  { label: 'Location', value: facts.location || '—', icon: 'location-01' },
  { label: 'Start time', value: facts.startTime, icon: 'clock-01' },
  { label: 'Est. duration', value: facts.duration, icon: 'time-02' },
])

// Figma "Creative direction": the first references of the shoot.
const references = computed(() => shoot.references.map(toReference))
const shownReferences = computed(() => references.value.slice(0, 2))
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <!-- Figma "Card / Shoot covers": the products' photos. Six columns on desktop
         (five photos and "+N"), two on mobile; a tile keeps its size however
         few photos there are. -->
    <section
      v-if="covers.photos.length"
      aria-label="Shoot photos"
      class="grid grid-cols-2 gap-3 md:grid-cols-6 md:rounded-2xl md:bg-card md:p-4"
    >
      <img
        v-for="photo in covers.photos"
        :key="photo.id"
        :src="photo.url"
        :alt="photo.name"
        loading="lazy"
        class="aspect-[4/5] w-full min-w-0 rounded-[20px] bg-muted object-cover object-top md:rounded-lg"
      />
      <div
        v-if="covers.more"
        class="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-[20px] bg-card md:rounded-xl md:bg-subtle"
      >
        <span class="text-h4 text-primary">+{{ covers.more }}</span>
        <span class="text-center text-p3 font-medium text-secondary">More from this shoot</span>
      </div>
    </section>

    <!-- Figma "Card / Shoot brief": only Creative direction has data yet. -->
    <section
      v-if="references.length"
      aria-labelledby="creative-direction"
      class="flex flex-col gap-2.5 rounded-2xl bg-card p-5"
    >
      <h2 id="creative-direction" class="text-p1 font-semibold text-primary">Creative direction</h2>
      <div class="flex items-center gap-2.5">
        <VThumbnail
          v-for="reference in shownReferences"
          :key="reference.id"
          :src="reference.previewUrl"
          :icon-size="16"
          class="h-[75px] w-[42px] rounded-md"
        >
          <span
            v-if="reference.kind === 'video'"
            class="absolute inset-0 m-auto flex size-5 items-center justify-center rounded-[10px] bg-overlay-scrim text-inverse"
          >
            <VIcon name="play" :size="12" />
          </span>
        </VThumbnail>
        <p class="text-p2 font-medium text-link">
          {{ references.length }} {{ references.length === 1 ? 'reference' : 'references' }}
        </p>
      </div>
    </section>

    <section
      aria-labelledby="shoot-products"
      class="flex flex-col gap-4 rounded-2xl bg-card p-4 md:p-5"
    >
      <h2 id="shoot-products" class="text-h6 text-primary">Products in this shoot</h2>
      <ul class="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
        <li
          v-for="product in products"
          :key="product.id"
          class="flex min-w-0 items-center gap-3 rounded-xl border border-default p-3"
        >
          <VThumbnail :src="product.photoUrl" :icon-size="18" class="h-20 w-16 rounded-lg" />
          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <p class="truncate text-p2 font-semibold text-primary">{{ product.name }}</p>
            <p v-if="product.collection" class="truncate text-p3 font-medium text-secondary">
              {{ product.collection }}
            </p>
            <div class="flex items-center gap-2.5">
              <ProgressBar
                :percent="product.percent"
                :label="`${product.name}: deliverables approved`"
                class="flex-1"
              />
              <span class="shrink-0 text-p3 font-medium text-secondary">
                {{ product.counts.approved }} / {{ product.counts.total }}
              </span>
            </div>
          </div>
        </li>
      </ul>
    </section>

    <div class="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-2">
      <section
        aria-labelledby="shoot-progress"
        class="flex flex-col gap-4 rounded-2xl bg-card p-4 md:p-5"
      >
        <h2 id="shoot-progress" class="text-h6 text-primary">Progress</h2>
        <div class="flex items-center justify-between text-p2 text-primary">
          <span class="font-medium">
            {{ counts.approved }} / {{ deliverablesLabel(counts.total) }}
          </span>
          <span class="font-semibold">{{ percent }}%</span>
        </div>
        <ProgressBar :percent="percent" />
        <dl class="flex flex-wrap gap-3">
          <div
            v-for="key in summary"
            :key="key"
            class="flex flex-row-reverse items-center gap-2.5 rounded-[10px] bg-subtle p-3"
          >
            <dt>
              <VStatus :tone="deliverableStatuses[key].tone">
                {{ deliverableStatuses[key].label }}
              </VStatus>
            </dt>
            <dd class="text-h5 text-primary">{{ counts[key] }}</dd>
          </div>
        </dl>
      </section>

      <section
        aria-labelledby="shoot-details"
        class="flex flex-col justify-between gap-6 rounded-2xl bg-card p-4 md:p-5"
      >
        <h2 id="shoot-details" class="text-h6 text-primary">Shoot details</h2>
        <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-5">
          <div v-for="item in details" :key="item.label" class="flex min-w-0 items-center gap-3">
            <VIcon :name="item.icon" :size="20" class="shrink-0 text-secondary" />
            <div class="flex min-w-0 flex-col gap-1">
              <dt class="text-p3 font-medium text-secondary">{{ item.label }}</dt>
              <dd class="text-p2 font-medium break-words text-primary">{{ item.value }}</dd>
            </div>
          </div>
        </dl>
      </section>
    </div>

    <section
      aria-labelledby="shoot-team"
      class="flex flex-col gap-4 rounded-2xl bg-card p-4 md:p-5"
    >
      <h2 id="shoot-team" class="text-h6 text-primary">Team</h2>
      <ul class="flex flex-wrap gap-x-6 gap-y-4">
        <li v-for="person in people" :key="person.member.id" class="flex items-center gap-2">
          <VAvatar :name="person.member.name" :src="person.member.photo_url" :size="36" />
          <div class="flex flex-col gap-1">
            <p class="text-p2 font-semibold text-primary">{{ person.member.name || 'Unnamed' }}</p>
            <p class="text-p3 font-medium text-secondary">{{ person.role }}</p>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
