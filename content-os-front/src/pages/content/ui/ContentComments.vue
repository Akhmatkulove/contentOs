<script setup lang="ts">
import { useMediaQuery, useTextareaAutosize } from '@vueuse/core'
import { computed, useId, useTemplateRef } from 'vue'
import { useSessionStore } from '@/entities/session'
import { VAvatar } from '@/shared/ui/avatar'
import { SUPPORT_TELEGRAM_URL } from '@/shared/config'
import { VButton } from '@/shared/ui/button'
import { VDropdownMenu, VDropdownMenuItem } from '@/shared/ui/dropdown-menu'
import { VIcon } from '@/shared/ui/icon'
import type { ContentComment } from '../api/content'
import {
  COMMENT_MAX,
  commentRole,
  sendsOnKey,
  shortDateTime,
  type FeedEntry,
} from '../model/content-details'

const { feed, canComment, sending, canSend } = defineProps<{
  feed: FeedEntry[]
  canComment: boolean
  sending: boolean
  canSend: boolean
}>()
const draft = defineModel<string>('draft', { required: true })
const emit = defineEmits<{ send: []; remove: [comment: ContentComment] }>()

const session = useSessionStore()
const headingId = useId()
const field = useTemplateRef('field')
// Grows with the text up to max-h-40, then scrolls.
useTextareaAutosize({ element: field, input: draft })
const count = computed(() => feed.filter((entry) => entry.kind === 'comment').length)

// Enter sends with a keyboard; on a phone it breaks the line, and the button sends.
const finePointer = useMediaQuery('(pointer: fine)')
function onKeydown(event: KeyboardEvent) {
  if (!finePointer.value || !sendsOnKey(event)) return
  event.preventDefault()
  emit('send')
}

defineExpose({ focus: () => field.value?.focus() })
</script>

<!--
  Figma "Card / Comments" without the Activity tab and the "…" of a comment.
  Only the brand and the shoot's art director write; everyone else reads. The
  brand's approval sits in the feed where it happened.
-->
<template>
  <section
    :aria-labelledby="headingId"
    class="flex flex-col gap-4 rounded-2xl bg-card p-4 md:gap-5 md:p-5"
  >
    <div class="flex items-center gap-2">
      <h2 :id="headingId" class="text-h6 text-primary">Comments</h2>
      <span
        v-if="count"
        class="flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-1.5 text-p3 font-medium text-primary tabular-nums"
      >
        {{ count }}
      </span>
    </div>

    <form v-if="canComment" class="flex items-end gap-3" @submit.prevent="emit('send')">
      <VAvatar
        :name="session.me?.name ?? null"
        :src="session.me?.photo_url ?? null"
        :size="36"
        class="mb-1 hidden sm:flex"
      />
      <div
        class="flex min-h-11 min-w-0 flex-1 items-end gap-2.5 rounded-[22px] bg-subtle py-1.5 pr-1.5 pl-4 transition-shadow focus-within:ring-2 focus-within:ring-violet-200"
      >
        <label :for="`${headingId}-field`" class="sr-only">Add a comment</label>
        <textarea
          :id="`${headingId}-field`"
          ref="field"
          v-model="draft"
          rows="1"
          :maxlength="COMMENT_MAX"
          placeholder="Add a comment…"
          :enterkeyhint="finePointer ? 'send' : 'enter'"
          class="max-h-40 min-w-0 flex-1 resize-none self-center bg-transparent py-1 text-table font-medium text-primary outline-none placeholder:text-secondary"
          @keydown="onKeydown"
        />
        <VButton
          type="submit"
          size="icon-32"
          aria-label="Send comment"
          :disabled="!canSend"
          class="transition-[background-color,scale] active:scale-90"
        >
          <span
            v-if="sending"
            aria-hidden="true"
            class="size-3.5 animate-spin rounded-full border-2 border-violet-200 border-t-white"
          />
          <VIcon v-else name="sent" :size="15" />
        </VButton>
      </div>
    </form>

    <!-- A long thread scrolls inside the card; the composer stays put. -->
    <TransitionGroup
      v-if="feed.length"
      tag="ul"
      aria-label="Comments"
      class="-mx-2 flex max-h-[min(520px,60dvh)] flex-col gap-1 overflow-y-auto overscroll-contain px-2"
      enter-active-class="transition-[opacity,translate] duration-300 ease-out motion-reduce:transition-none"
      enter-from-class="-translate-y-1 opacity-0"
      leave-active-class="transition-opacity duration-200 motion-reduce:transition-none"
      leave-to-class="opacity-0"
    >
      <li v-for="entry in feed" :key="entry.key">
        <div
          v-if="entry.kind === 'approved'"
          class="flex items-center gap-3 rounded-xl bg-mint-100/50 p-2.5"
        >
          <span
            class="flex size-9 shrink-0 items-center justify-center rounded-full bg-mint-100 text-mint-400"
          >
            <VIcon name="checkmark-circle-02" :size="18" />
          </span>
          <p class="flex min-w-0 flex-wrap items-center gap-x-2 text-p3 font-medium text-secondary">
            <span class="text-table font-semibold text-mint-400"
              >The brand approved the content</span
            >
            <span aria-hidden="true" class="text-tertiary">•</span>
            <time :datetime="entry.at">{{ shortDateTime(entry.at) }}</time>
          </p>
        </div>

        <article v-else class="flex gap-3 rounded-xl p-2.5">
          <VAvatar
            :name="entry.comment.author.name"
            :src="entry.comment.author.photo_url"
            :size="36"
          />
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <p
              class="flex min-w-0 flex-wrap items-center gap-x-2 text-p3 font-medium text-secondary"
            >
              <span class="truncate text-table font-semibold text-primary">
                {{ entry.comment.author.name || 'Unknown' }}
              </span>
              <span>{{ commentRole(entry.comment.role) }}</span>
              <span aria-hidden="true" class="text-tertiary">•</span>
              <time :datetime="entry.comment.created_at">
                {{ shortDateTime(entry.comment.created_at) }}
              </time>
            </p>
            <p class="text-p2 font-medium break-words whitespace-pre-line text-primary">
              {{ entry.comment.body }}
            </p>
          </div>

          <!-- Your own comment: delete it; someone else's: report it to support. -->
          <VDropdownMenu align="end" content-class="w-52">
            <template #trigger>
              <VButton
                variant="ghost"
                size="icon-24"
                :aria-label="`Comment by ${entry.comment.author.name || 'Unknown'}: actions`"
                class="-mt-0.5 shrink-0 text-tertiary hover:bg-subtle hover:text-primary data-[state=open]:bg-status-accent data-[state=open]:text-link"
              >
                <VIcon name="more-horizontal" :size="16" />
              </VButton>
            </template>
            <VDropdownMenuItem
              v-if="entry.comment.author.id === session.me?.id"
              class="text-red-400 data-highlighted:bg-red-100/40"
              @select="emit('remove', entry.comment)"
            >
              <VIcon name="delete-03" :size="16" />
              Delete comment
            </VDropdownMenuItem>
            <VDropdownMenuItem v-else as-child class="text-red-400 data-highlighted:bg-red-100/40">
              <a :href="SUPPORT_TELEGRAM_URL" target="_blank" rel="noopener noreferrer">
                <VIcon name="flag-02" :size="16" />
                Report comment
              </a>
            </VDropdownMenuItem>
          </VDropdownMenu>
        </article>
      </li>
    </TransitionGroup>

    <div v-else class="flex flex-col items-center gap-2 py-6 text-center">
      <span class="flex size-11 items-center justify-center rounded-full bg-muted text-secondary">
        <VIcon name="sent" :size="18" />
      </span>
      <p class="max-w-64 text-p3 font-medium text-secondary">
        {{
          canComment
            ? 'No comments yet. Share feedback with the team.'
            : 'No comments yet. The brand and the art director discuss the content here.'
        }}
      </p>
    </div>
  </section>
</template>
