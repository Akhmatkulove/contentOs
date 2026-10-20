<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VStatus } from '@/shared/ui/status'
import { contentSubtitle } from '../model/content-details'
import { contentStatusChip } from '../model/content-item'
import { useContentPage } from '../model/content-page'
import ApproveButton from './ApproveButton.vue'
import ContentComments from './ContentComments.vue'
import ContentSidebar from './ContentSidebar.vue'
import ContentStage from './ContentStage.vue'

// The route's :id: the sent deliverable.
const { id } = defineProps<{ id: string }>()

const {
  content,
  loading,
  error,
  notFound,
  selected,
  current,
  thumbnails,
  openViewer,
  openReference,
  toggleFavorite,
  draft,
  canSend,
  sending,
  submitComment,
  removeComment,
  approve,
  approving,
  feed,
  previous,
  next,
  back,
} = useContentPage(() => id)

const status = computed(() => (content.value ? contentStatusChip[content.value.status] : null))
</script>

<!--
  Figma "SCREEN:c_item Content / Walking transition". Desktop: stage, comments
  and details side by side; tablet: stage and details, comments under them;
  mobile: one column. The brand's Approve sits next to Copy link.
  Previous / Next walk the content page's default order (newest first).
-->
<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <nav
      aria-label="Content navigation"
      class="flex min-h-11 items-center justify-between gap-4 md:min-h-0"
    >
      <RouterLink
        :to="back"
        class="flex items-center gap-2 text-p2 font-medium text-secondary transition-colors hover:text-brand"
      >
        <VIcon name="arrow-left-01-sharp" :size="16" />
        Back to content
      </RouterLink>

      <div v-if="content" class="flex items-center gap-4.5 text-p2 font-medium">
        <component
          :is="previous ? RouterLink : 'span'"
          :to="previous ?? undefined"
          :replace="previous ? true : undefined"
          :aria-disabled="previous ? undefined : true"
          :class="[
            'flex items-center gap-1.5 transition-colors',
            previous ? 'text-secondary hover:text-brand' : 'text-tertiary',
          ]"
        >
          <VIcon name="arrow-left-01-sharp" :size="16" />
          Previous
        </component>
        <component
          :is="next ? RouterLink : 'span'"
          :to="next ?? undefined"
          :replace="next ? true : undefined"
          :aria-disabled="next ? undefined : true"
          :class="[
            'flex items-center gap-1.5 transition-colors',
            next ? 'text-secondary hover:text-brand' : 'text-tertiary',
          ]"
        >
          Next
          <VIcon name="arrow-right-01-sharp" :size="16" />
        </component>
      </div>
    </nav>

    <!-- First load: placeholders in the page's layout. -->
    <div v-if="loading" aria-busy="true" class="flex flex-col gap-5">
      <span class="sr-only">Loading…</span>
      <div class="flex flex-col gap-2">
        <div class="h-7 w-2/3 max-w-80 animate-pulse rounded-lg bg-neutral-300 md:h-9" />
        <div class="h-4 w-48 animate-pulse rounded-md bg-neutral-300" />
      </div>
      <div
        class="grid gap-5 md:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[324px_minmax(0,1fr)_320px]"
      >
        <div class="aspect-[4/5] animate-pulse rounded-2xl bg-neutral-300 md:aspect-[9/16]" />
        <div class="hidden h-96 animate-pulse rounded-2xl bg-neutral-300 md:block" />
        <div class="hidden h-96 animate-pulse rounded-2xl bg-neutral-300 xl:block" />
      </div>
    </div>

    <div
      v-else-if="!content || notFound"
      class="flex flex-col items-center gap-4 rounded-3xl bg-card px-6 py-14 text-center"
    >
      <span class="flex size-12 items-center justify-center rounded-full bg-muted text-secondary">
        <VIcon name="image-02" :size="22" />
      </span>
      <p class="max-w-80 text-p2 font-medium text-secondary">
        {{
          notFound
            ? 'This content doesn’t exist or you don’t have access to it.'
            : error
              ? 'Couldn’t load the content. Please try again.'
              : ''
        }}
      </p>
      <VButton as-child variant="secondary" size="36">
        <RouterLink :to="{ name: 'content' }">All content</RouterLink>
      </VButton>
    </div>

    <template v-else>
      <header class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="flex min-w-0 flex-col gap-1.5">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 class="text-h4 break-words text-primary md:text-h3">{{ content.name }}</h1>
            <VStatus v-if="status" :tone="status.tone">{{ status.label }}</VStatus>
          </div>
          <p class="text-p2 font-medium text-secondary">
            <template v-for="(part, index) in contentSubtitle(content)" :key="index">
              <span v-if="index" aria-hidden="true" class="mx-2">•</span>{{ part }}
            </template>
          </p>
        </div>

        <div class="flex shrink-0 flex-wrap items-center gap-2.5 md:flex-nowrap">
          <!-- Selected: the star fills (--icon-fill in the sprite's star). -->
          <VButton
            v-if="content.can_favorite"
            variant="secondary"
            size="icon-40"
            :aria-label="content.favorite ? 'Remove from favorites' : 'Add to favorites'"
            :aria-pressed="content.favorite"
            :class="[
              'text-primary transition-[background-color,border-color,scale] active:scale-90',
              content.favorite &&
                'border-violet-200 bg-status-accent text-link [--icon-fill:currentColor]',
            ]"
            @click="toggleFavorite"
          >
            <VIcon name="star" :size="16" />
          </VButton>
          <!-- TODO(api): Download and Copy link don't do anything yet. -->
          <VButton variant="secondary" class="flex-1 text-primary md:flex-none">
            <VIcon name="download-01" />
            Download
          </VButton>
          <VButton variant="secondary" class="flex-1 text-primary md:flex-none">
            <VIcon name="copy-link" />
            Copy link
          </VButton>
          <!-- Mobile: a full-width row under the other actions. -->
          <ApproveButton
            :key="content.id"
            :approved-at="content.approved_at"
            :can-approve="content.can_approve"
            :pending="approving"
            class="w-full md:w-auto"
            @approve="approve"
          />
        </div>
      </header>

      <div
        class="grid grid-cols-1 items-start gap-4 [grid-template-areas:'stage'_'comments'_'side'] md:grid-cols-[300px_minmax(0,1fr)] md:gap-5 md:[grid-template-areas:'stage_side'_'comments_comments'] xl:grid-cols-[324px_minmax(0,1fr)_320px] xl:[grid-template-areas:'stage_comments_side']"
      >
        <ContentStage
          v-if="current"
          v-model:selected="selected"
          :current="current"
          :rail="thumbnails"
          :total="content.materials.length"
          :title="content.name"
          class="[grid-area:stage] xl:sticky xl:top-10"
          @open="openViewer"
        />
        <ContentComments
          :key="content.id"
          v-model:draft="draft"
          :feed="feed"
          :can-comment="content.can_comment"
          :sending="sending"
          :can-send="canSend"
          class="[grid-area:comments]"
          @send="submitComment"
          @remove="removeComment"
        />
        <ContentSidebar
          :content="content"
          class="[grid-area:side]"
          @open-reference="openReference"
        />
      </div>
    </template>
  </div>
</template>
