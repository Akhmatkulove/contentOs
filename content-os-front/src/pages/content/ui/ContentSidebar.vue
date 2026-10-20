<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { fileSizeLabel, versionLabel, versionStatus } from '@/entities/deliverable'
import { toReference } from '@/entities/reference'
import { useSessionStore } from '@/entities/session'
import { VAvatar } from '@/shared/ui/avatar'
import { VIcon } from '@/shared/ui/icon'
import { VStatus } from '@/shared/ui/status'
import type { ContentDetails, ContentReference } from '../api/content'
import {
  SIDEBAR_REFERENCES,
  calendarDate,
  deliverableHint,
  longDateTime,
  referenceHint,
  shootRoleLabel,
  shortDateTime,
} from '../model/content-details'

const { content } = defineProps<{ content: ContentDetails }>()
const emit = defineEmits<{ openReference: [reference: ContentReference] }>()

// The reference page is the team's; the brand looks at the files in the viewer
// or follows the link.
const session = useSessionStore()
const team = computed(() => session.me?.role !== 'brand')
const references = computed(() =>
  content.references.slice(0, SIDEBAR_REFERENCES).map((item) => ({
    item,
    card: toReference(item),
    hint: referenceHint(item),
    row: rowTarget(item),
  })),
)

// What a reference row is: a link to its page, a button opening the viewer, a
// link out, or just a line.
function rowTarget(item: ContentReference): { is: unknown; attrs: Record<string, unknown> } {
  if (team.value)
    return { is: RouterLink, attrs: { to: { name: 'reference', params: { id: item.id } } } }
  if (item.files.length)
    return { is: 'button', attrs: { type: 'button', onClick: () => emit('openReference', item) } }
  if (item.link)
    return { is: 'a', attrs: { href: item.link, target: '_blank', rel: 'noopener noreferrer' } }
  return { is: 'div', attrs: {} }
}
// With several assignees each version says whose it is.
const severalAuthors = computed(
  () => new Set(content.versions?.map((version) => version.author.id)).size > 1,
)

const versions = computed(() =>
  (content.versions ?? []).map((version) => ({
    ...version,
    status: versionStatus(version.review, false, ''),
  })),
)

const rowLabel = 'text-p3 font-medium text-secondary'
const rowValue = 'truncate text-table font-semibold text-primary'
const rowHint = 'truncate text-p3 font-medium text-secondary'
</script>

<!--
  Figma "Right column" of "SCREEN:c_item Content" without Edit and Resolution.
  The shoot only for the shoot's team, the references for everyone (the brand
  too); the versions only for its art director.
-->
<template>
  <div class="flex flex-col gap-4">
    <section aria-label="Details" class="flex flex-col gap-4 rounded-2xl bg-card p-4 md:p-5">
      <h2 class="text-h6 text-primary">Details</h2>

      <RouterLink
        :to="{ name: 'product', params: { id: content.product.id } }"
        class="group -m-2 flex items-center gap-3 rounded-xl p-2 transition-colors outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-violet-300"
      >
        <img
          v-if="content.product.photo"
          :src="content.product.photo.url"
          alt=""
          class="h-15 w-12 shrink-0 rounded-lg object-cover"
        />
        <span
          v-else
          class="flex h-15 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-secondary"
        >
          <VIcon name="package" :size="18" />
        </span>
        <span class="flex min-w-0 flex-1 flex-col gap-1">
          <span :class="rowLabel">Product</span>
          <span class="truncate text-p2 font-semibold text-primary">{{
            content.product.name
          }}</span>
        </span>
        <VIcon
          name="arrow-right-01-sharp"
          :size="16"
          class="text-secondary transition-transform group-hover:translate-x-0.5"
        />
      </RouterLink>

      <div class="h-px bg-neutral-300" />

      <dl class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <dt :class="rowLabel">Deliverable</dt>
          <dd class="flex gap-2">
            <VIcon name="file-01" :size="16" class="mt-px text-primary" />
            <span class="flex min-w-0 flex-col gap-0.5">
              <span :class="rowValue">{{ content.name }}</span>
              <span :class="rowHint">{{ deliverableHint(content) }}</span>
            </span>
          </dd>
        </div>

        <div v-if="content.shoot" class="flex flex-col gap-1.5">
          <dt :class="rowLabel">Shoot</dt>
          <dd class="flex gap-2">
            <VIcon name="calendar-03" :size="16" class="mt-px text-primary" />
            <span class="flex min-w-0 flex-col gap-0.5">
              <span :class="rowValue">{{ content.shoot.name }}</span>
              <span :class="rowHint">
                {{ calendarDate(content.shoot.date)
                }}<template v-if="content.shoot.location">
                  <span aria-hidden="true" class="mx-1.5">•</span>{{ content.shoot.location }}
                </template>
              </span>
            </span>
          </dd>
        </div>

        <div v-for="person in content.people" :key="person.member.id" class="flex flex-col gap-1.5">
          <dt :class="rowLabel">{{ shootRoleLabel(person.role) }}</dt>
          <dd class="flex items-center gap-2">
            <VAvatar :name="person.member.name" :src="person.member.photo_url" :size="24" />
            <span :class="rowValue">{{ person.member.name || 'Unknown' }}</span>
          </dd>
        </div>

        <div class="flex flex-col gap-1.5">
          <dt :class="rowLabel">Uploaded</dt>
          <dd class="flex items-center gap-2">
            <VIcon name="calendar-03" :size="16" class="text-primary" />
            <time :datetime="content.sent_at" :class="rowValue">
              {{ longDateTime(content.sent_at) }}
            </time>
          </dd>
        </div>
      </dl>
    </section>

    <section
      v-if="references.length"
      aria-label="References"
      class="flex flex-col gap-4 rounded-2xl bg-card p-4 md:p-5"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <h2 class="text-h6 text-primary">References</h2>
          <span
            class="flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-1.5 text-p3 font-medium text-primary tabular-nums"
          >
            {{ content.references.length }}
          </span>
        </div>
        <!-- Only when the sidebar can't fit them all. -->
        <RouterLink
          v-if="content.references.length > SIDEBAR_REFERENCES"
          :to="{
            name: 'product',
            params: { id: content.product.id },
            query: { tab: 'references' },
          }"
          class="text-table font-medium text-link hover:underline"
        >
          View all
        </RouterLink>
      </div>
      <ul class="flex flex-col gap-1">
        <li v-for="{ item, card, hint, row } in references" :key="item.id">
          <component
            :is="row.is"
            v-bind="row.attrs"
            class="group -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl p-2 text-left transition-colors outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-violet-300"
          >
            <img
              v-if="card.previewUrl"
              :src="card.previewUrl"
              alt=""
              loading="lazy"
              class="h-[70px] w-14 shrink-0 rounded-lg object-cover"
            />
            <span
              v-else
              class="flex h-[70px] w-14 shrink-0 items-center justify-center rounded-lg bg-muted text-secondary"
            >
              <VIcon
                :name="
                  item.link && !item.files.length
                    ? 'link-01'
                    : card.kind === 'video'
                      ? 'video-01'
                      : 'image-02'
                "
                :size="18"
              />
            </span>
            <span class="flex min-w-0 flex-1 flex-col gap-1">
              <span :class="rowValue">{{ card.title }}</span>
              <span :class="rowHint">{{ hint }}</span>
            </span>
            <VIcon
              name="arrow-right-01-sharp"
              :size="16"
              class="shrink-0 text-secondary transition-transform group-hover:translate-x-0.5"
            />
          </component>
        </li>
      </ul>
    </section>

    <section
      v-if="content.versions"
      aria-label="Versions"
      class="flex flex-col gap-4 rounded-2xl bg-card p-4 md:p-5"
    >
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-h6 text-primary">Versions</h2>
        <span
          class="flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-1.5 text-p3 font-medium text-primary tabular-nums"
        >
          {{ content.versions.length }}
        </span>
      </div>
      <ul v-if="versions.length" class="flex flex-col gap-2">
        <li
          v-for="version in versions"
          :key="version.id"
          class="flex items-center gap-3 rounded-xl bg-subtle p-2.5"
        >
          <span class="shrink-0 text-table font-semibold text-primary">
            {{ versionLabel(version) }}
          </span>
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="truncate text-p3 font-medium text-primary">
              {{ shortDateTime(version.submitted_at) }}
            </span>
            <span class="truncate text-p4 font-medium text-secondary">
              <template v-if="severalAuthors">{{ version.author.name }} · </template>
              {{ fileSizeLabel(version.size) }}
            </span>
          </span>
          <VStatus v-if="version.status" :tone="version.status.tone">
            {{ version.status.label }}
          </VStatus>
        </li>
      </ul>
    </section>
  </div>
</template>
