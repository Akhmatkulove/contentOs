<script setup lang="ts">
import { linkHost } from '@/entities/reference'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { useReferencePage } from '../model/reference-page'
import ReferenceGallery from './ReferenceGallery.vue'

// The route's :id.
const { id } = defineProps<{ id: string }>()

const {
  reference,
  loading,
  error,
  notFound,
  title,
  facts,
  files,
  link,
  canRemove,
  removing,
  toggleFavorite,
  removeReference,
  openFile,
  back,
  backLabel,
} = useReferencePage(() => id)
</script>

<!--
  Not in Figma yet: built from the product page's parts (back link, heading,
  white cards, tag chips). The files come first and uncropped; the details sit
  beside them on wide screens and under them on narrow ones.
-->
<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <div class="flex min-h-11 items-center md:min-h-0">
      <RouterLink
        :to="back"
        class="flex items-center gap-1.5 text-p3 font-medium text-secondary transition-colors hover:text-brand"
      >
        <VIcon name="arrow-left-02-sharp" :size="14" />
        {{ backLabel }}
      </RouterLink>
    </div>

    <!-- First load: placeholders in the page's layout. -->
    <div v-if="loading" aria-busy="true" class="flex flex-col gap-5">
      <span class="sr-only">Loading…</span>
      <div class="flex flex-col gap-2">
        <div class="h-7 w-2/3 max-w-80 animate-pulse rounded-lg bg-neutral-300 md:h-9" />
        <div class="h-4 w-40 animate-pulse rounded-md bg-neutral-300" />
      </div>
      <div class="flex gap-5 xl:items-start">
        <div class="aspect-[4/5] max-h-[70dvh] flex-1 animate-pulse rounded-2xl bg-neutral-300" />
        <div class="hidden h-80 w-[320px] animate-pulse rounded-3xl bg-neutral-300 xl:block" />
      </div>
    </div>

    <div
      v-else-if="!reference || notFound"
      class="flex flex-col items-center gap-4 rounded-3xl bg-card px-6 py-14 text-center"
    >
      <span class="flex size-12 items-center justify-center rounded-full bg-muted text-secondary">
        <VIcon name="image-02" :size="22" />
      </span>
      <p class="max-w-80 text-p2 font-medium text-secondary">
        {{
          notFound
            ? 'This reference doesn’t exist or you don’t have access to it.'
            : error
              ? 'Couldn’t load the reference. Please try again.'
              : ''
        }}
      </p>
      <VButton as-child variant="secondary" size="36">
        <RouterLink :to="{ name: 'references' }">All references</RouterLink>
      </VButton>
    </div>

    <template v-else>
      <header class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div class="flex min-w-0 flex-col gap-2">
          <h1 class="text-h4 break-words text-primary md:text-h3">{{ title }}</h1>
          <p class="text-p2 font-medium text-secondary">
            <template v-for="(fact, index) in facts.slice(0, 3)" :key="fact.label">
              <span v-if="index" aria-hidden="true" class="mx-2">·</span>{{ fact.value }}
            </template>
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <!-- Selected: the star fills (--icon-fill in the sprite's star). -->
          <VButton
            variant="secondary"
            size="36"
            :aria-pressed="reference.favorite"
            :class="[
              'flex-1 md:flex-none',
              reference.favorite && 'border-violet-200 bg-status-accent [--icon-fill:currentColor]',
            ]"
            @click="toggleFavorite"
          >
            <VIcon name="star" />
            {{ reference.favorite ? 'In favorites' : 'Add to favorites' }}
          </VButton>
          <VButton
            v-if="canRemove"
            variant="secondary"
            size="icon-36"
            aria-label="Delete reference"
            :disabled="removing"
            class="text-secondary hover:border-red-200 hover:bg-red-100 hover:text-red-400 active:border-red-200 active:bg-red-100 active:text-red-400"
            @click="removeReference"
          >
            <VIcon name="delete-03" :size="16" />
          </VButton>
        </div>
      </header>

      <div class="flex flex-col gap-4 md:gap-5 xl:flex-row xl:items-start">
        <section aria-label="Content" class="min-w-0 flex-1">
          <ReferenceGallery v-if="files.length" :files="files" :title="title" @open="openFile" />

          <!-- A link reference: where it leads and the way there. -->
          <a
            v-else-if="link"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            class="group flex flex-col items-center gap-5 rounded-3xl bg-card px-6 py-14 text-center transition-shadow outline-none hover:shadow-[0_8px_32px_4px_rgb(29_42_60/0.08)] focus-visible:ring-2 focus-visible:ring-violet-300 md:py-20"
          >
            <span
              class="flex size-16 items-center justify-center rounded-2xl bg-status-accent text-link transition-transform duration-300 group-hover:-translate-y-0.5"
            >
              <VIcon :name="link.icon" :size="28" />
            </span>
            <span class="flex max-w-full flex-col gap-1.5">
              <span class="text-h6 text-primary">{{ linkHost(link.url) }}</span>
              <span class="truncate text-p3 font-medium text-tertiary">{{ link.url }}</span>
            </span>
            <span
              class="inline-flex h-9 items-center gap-1.5 rounded-full bg-action-accent px-4 text-table font-semibold text-inverse transition-colors group-hover:bg-inverse"
            >
              Open link
              <VIcon name="link-square-01" :size="14" />
            </span>
          </a>
        </section>

        <aside
          aria-label="Details"
          class="flex flex-col gap-5 rounded-3xl bg-card p-5 xl:sticky xl:top-10 xl:w-[320px] xl:shrink-0"
        >
          <h2 class="text-h6 text-primary">Details</h2>
          <dl class="flex flex-col">
            <div
              v-for="fact in facts"
              :key="fact.label"
              class="flex items-baseline justify-between gap-4 border-b border-subtle py-2.5 first:pt-0 last:border-0 last:pb-0"
            >
              <dt class="shrink-0 text-p3 font-medium text-tertiary">{{ fact.label }}</dt>
              <dd class="min-w-0 truncate text-right text-p2 font-medium text-primary">
                {{ fact.value }}
              </dd>
            </div>
          </dl>

          <div v-if="reference.notes" class="flex flex-col gap-2">
            <h3 class="text-p3 font-medium text-tertiary">Notes</h3>
            <p class="text-p2 font-medium break-words whitespace-pre-line text-primary">
              {{ reference.notes }}
            </p>
          </div>

          <div v-if="reference.tags.length" class="flex flex-col gap-2">
            <h3 class="text-p3 font-medium text-tertiary">Tags</h3>
            <ul class="flex flex-wrap gap-1.5">
              <li
                v-for="tag in reference.tags"
                :key="tag"
                class="rounded-full bg-neutral-200 px-2.5 py-1 text-p4 font-medium text-neutral-700"
              >
                {{ tag }}
              </li>
            </ul>
          </div>

          <VButton
            v-if="link && files.length"
            as-child
            variant="secondary"
            size="36"
            class="w-full"
          >
            <a :href="link.url" target="_blank" rel="noopener noreferrer">
              <VIcon :name="link.icon" />
              Open {{ linkHost(link.url) }}
            </a>
          </VButton>
        </aside>
      </div>
    </template>
  </div>
</template>
