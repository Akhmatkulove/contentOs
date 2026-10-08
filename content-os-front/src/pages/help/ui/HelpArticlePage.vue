<script setup lang="ts">
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VNotificationButton } from '@/shared/ui/notification-button'
import { useHelpArticle } from '../model/article'

const { slug } = defineProps<{ slug: string }>()

const { topic, vote } = useHelpArticle(() => slug)
</script>

<!--
  Figma "Profile / How to complete a task" (desktop): a help article.
  TODO(ui): mobile screen — comes later.
-->
<template>
  <div class="flex flex-col gap-8">
    <div class="flex min-h-11 items-center justify-between gap-4">
      <RouterLink
        :to="{ name: 'help' }"
        class="flex items-center gap-2 text-p2 font-medium text-secondary transition-colors hover:text-brand"
      >
        <VIcon name="arrow-left-02-sharp" :size="18" />
        Back to Help &amp; support
      </RouterLink>
      <!-- TODO(api): notifications — the dot is always on until they exist. -->
      <VNotificationButton unread class="hidden lg:inline-flex" />
    </div>

    <p v-if="!topic" class="py-10 text-center text-p2 font-medium text-secondary">
      This article doesn’t exist.
    </p>

    <template v-else>
      <header class="flex flex-col gap-1.5">
        <h1 class="text-h3 text-primary">{{ topic.title }}</h1>
        <p class="text-p2 font-medium text-secondary">{{ topic.description }}.</p>
      </header>

      <p class="text-table font-medium text-secondary">
        Updated {{ topic.article.updated }} · {{ topic.article.readMinutes }} min read
      </p>

      <!-- Figma sets the article in 20/28 and 15/24, outside the type scale. -->
      <ol class="flex flex-col gap-6 rounded-[20px] bg-card p-6">
        <li v-for="(step, i) in topic.article.steps" :key="step.title" class="flex flex-col gap-2">
          <h2 class="text-[20px]/7 font-semibold text-brand">{{ i + 1 }}. {{ step.title }}</h2>
          <p class="text-[15px]/6 font-medium text-secondary">{{ step.text }}</p>
        </li>
      </ol>

      <section class="flex flex-wrap items-center gap-5 rounded-[20px] bg-card p-6">
        <p class="min-w-0 flex-1 text-p1 font-semibold text-primary">
          {{ vote ? 'Thanks for your feedback!' : 'Was this article helpful?' }}
        </p>
        <div v-if="!vote" class="flex gap-5">
          <VButton variant="soft" class="px-5" @click="vote = 'yes'">
            <VIcon name="thumbs-up" />
            Yes
          </VButton>
          <VButton variant="secondary" class="px-5" @click="vote = 'no'">
            <VIcon name="thumbs-down" />
            No
          </VButton>
        </div>
      </section>
    </template>
  </div>
</template>
