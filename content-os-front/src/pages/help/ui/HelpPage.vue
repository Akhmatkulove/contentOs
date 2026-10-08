<script setup lang="ts">
import { VButton } from '@/shared/ui/button'
import type { IconName } from '@/shared/ui/icon'
import { VIcon } from '@/shared/ui/icon'
import { VNotificationButton } from '@/shared/ui/notification-button'
import { VSearch } from '@/shared/ui/search'
import { useHelp } from '../model/help'

const { query, topics, back } = useHelp()

const categories: { title: string; description: string; icon: IconName }[] = [
  { title: 'Guides', description: 'Step-by-step instructions', icon: 'file-01' },
  { title: 'FAQs', description: 'Quick answers', icon: 'file-view' },
  { title: 'Contact support', description: 'Get help from our team', icon: 'mail-01' },
]
</script>

<!--
  Figma "Profile / Help & support" (desktop).
  TODO(ui): mobile screen — comes later.
  TODO(ui): Guides, FAQs and Contact support screens — not in Figma yet, the cards don't open.
  TODO(api): support contact — the Contact support button has nowhere to send.
-->
<template>
  <div class="flex flex-col gap-8">
    <div class="flex min-h-11 items-center justify-between gap-4">
      <VButton
        variant="ghost"
        class="h-auto gap-2 px-0 text-p2 font-medium hover:text-brand has-[>svg]:px-0"
        @click="back"
      >
        <VIcon name="arrow-left-02-sharp" :size="18" />
        Back
      </VButton>
      <!-- TODO(api): notifications — the dot is always on until they exist. -->
      <VNotificationButton unread class="hidden lg:inline-flex" />
    </div>

    <header class="flex flex-col gap-1.5">
      <h1 class="text-h3 text-primary">Help &amp; support</h1>
      <p class="text-p2 font-medium text-secondary">
        Find answers, get help, or reach out to our team.
      </p>
    </header>

    <VSearch
      v-model="query.search"
      placeholder="Search for help..."
      aria-label="Search for help"
      class="rounded-3xl bg-card md:h-10 md:bg-card"
    />

    <ul class="grid gap-5 md:grid-cols-3">
      <li
        v-for="category in categories"
        :key="category.title"
        class="flex h-24 items-center gap-3.5 rounded-[20px] bg-card p-5"
      >
        <span
          class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-status-accent text-link"
        >
          <VIcon :name="category.icon" :size="22" />
        </span>
        <span class="flex min-w-0 flex-1 flex-col gap-1.5">
          <span class="text-p1 font-semibold text-primary">{{ category.title }}</span>
          <span class="text-table font-medium text-secondary">{{ category.description }}</span>
        </span>
        <VIcon name="arrow-right-02-sharp" :size="16" class="text-link" />
      </li>
    </ul>

    <section
      aria-labelledby="popular-topics"
      class="flex flex-col gap-5 rounded-[20px] bg-card p-6"
    >
      <h2 id="popular-topics" class="text-h5 text-primary">Popular topics</h2>

      <ul v-if="topics.length" class="flex flex-col gap-5">
        <li v-for="topic in topics" :key="topic.slug">
          <component
            :is="topic.article ? 'RouterLink' : 'div'"
            :to="topic.article ? { name: 'help-article', params: { slug: topic.slug } } : undefined"
            class="group flex items-center gap-3.5 py-2"
          >
            <span class="flex min-w-0 flex-1 flex-col gap-1">
              <span
                class="text-p2 font-semibold text-primary transition-colors group-hover:text-link"
              >
                {{ topic.title }}
              </span>
              <span class="text-p3 font-medium text-secondary">{{ topic.description }}</span>
            </span>
            <VIcon
              v-if="topic.article"
              name="arrow-right-02-sharp"
              :size="18"
              class="text-secondary"
            />
          </component>
        </li>
      </ul>
      <p v-else class="py-2 text-p2 font-medium text-secondary">No topics match your search.</p>
    </section>

    <section
      aria-labelledby="still-need-help"
      class="flex flex-col gap-5 rounded-[20px] bg-status-accent p-6 md:flex-row md:items-center"
    >
      <span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-card text-link">
        <VIcon name="user-group" :size="22" />
      </span>
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <h2 id="still-need-help" class="text-h5 text-primary">Still need help?</h2>
        <p class="text-p2 font-medium text-link">Our team usually replies within 24 hours.</p>
      </div>
      <VButton class="self-start md:self-auto">
        <VIcon name="mail-01" />
        Contact support
      </VButton>
    </section>
  </div>
</template>
