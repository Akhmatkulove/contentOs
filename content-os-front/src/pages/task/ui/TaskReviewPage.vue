<script setup lang="ts">
import { computed } from 'vue'
import { RadioGroupRoot } from 'reka-ui'
import { VAvatar } from '@/shared/ui/avatar'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VStatus } from '@/shared/ui/status'
import { VTextarea } from '@/shared/ui/textarea'
import { VThumbnail } from '@/shared/ui/thumbnail'
import { FEEDBACK_MAX, firstReference } from '../model/review'
import { useReviewPage } from '../model/review-page'
import CreatorSwitcher from './CreatorSwitcher.vue'
import ReviewPreview from './ReviewPreview.vue'
import ReviewVersionCard from './ReviewVersionCard.vue'
import SendToBrand from './SendToBrand.vue'

// The route's :id: the deliverable (task) id.
const { id } = defineProps<{ id: string }>()

const {
  review,
  loading,
  error,
  notFound,
  status,
  lastUpload,
  creators,
  creator,
  selectCreator,
  version,
  selectVersion,
  file,
  selectFile,
  openFile,
  sent,
  canDecide,
  picked,
  form,
  feedbackError,
  decide,
  pending,
  canSend,
  waiting,
  progress,
  sending,
  send,
} = useReviewPage(() => id)

const reference = computed(() => (review.value ? firstReference(review.value) : null))
</script>

<!--
  Figma "SCREEN:s_review Shoot / Review deliverable". Figma shows one creator;
  with several, a switcher picks whose work is in the workspace (docs/adr/0015).
  Send to brand at the bottom isn't in Figma yet.
-->
<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <RouterLink
      :to="review ? { name: 'shoot', params: { id: review.shoot.id } } : { name: 'tasks' }"
      class="flex items-center gap-1.5 self-start text-p3 font-medium text-secondary transition-colors hover:text-brand"
    >
      <VIcon name="arrow-left-02-sharp" :size="14" />
      {{ review ? 'Back to shoot' : 'Back to My tasks' }}
    </RouterLink>

    <p v-if="loading" class="py-10 text-center text-p2 font-medium text-secondary">Loading…</p>

    <p v-else-if="!review" class="py-10 text-center text-p2 font-medium text-secondary">
      {{
        notFound
          ? 'This deliverable doesn’t exist or isn’t on your shoot.'
          : error
            ? 'Couldn’t load the deliverable. Please try again.'
            : ''
      }}
    </p>

    <template v-else>
      <!-- Figma "Shoot header". -->
      <header class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="flex min-w-0 flex-col gap-2">
          <h1 class="text-h4 break-words text-brand md:text-h3">
            Review deliverable: {{ review.name }}
          </h1>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p
              v-if="lastUpload"
              class="flex items-center gap-1.5 text-p3 font-medium text-secondary"
            >
              <VIcon name="calendar-02" :size="16" />
              {{ lastUpload }}
            </p>
            <VStatus v-if="status" :tone="status.tone">{{ status.label }}</VStatus>
          </div>
        </div>
        <VButton as-child variant="secondary" class="shrink-0 self-start md:self-auto md:px-5">
          <RouterLink :to="{ name: 'shoot-edit', params: { id: review.shoot.id } }">
            <VIcon name="edit-02" />
            Edit deliverable
          </RouterLink>
        </VButton>
      </header>

      <!-- Figma "Progress and details": reference, product, creator. -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-[538fr_400fr_294fr]">
        <section
          aria-labelledby="review-reference"
          class="flex flex-col gap-3 rounded-2xl bg-card p-4 md:col-span-2 md:p-5 lg:col-span-1"
        >
          <h2 id="review-reference" class="text-h6 text-brand">Reference</h2>
          <RouterLink
            v-if="reference"
            :to="{ name: 'reference', params: { id: reference.id } }"
            class="flex min-w-0 items-center gap-3 rounded-2xl bg-muted p-3 transition-colors hover:bg-status-accent"
          >
            <VThumbnail
              :src="reference.previewUrl"
              :icon-size="16"
              class="h-[54px] w-11 rounded-lg"
            />
            <span class="flex min-w-0 flex-col gap-2">
              <span class="truncate text-p2 font-semibold text-brand">{{ reference.title }}</span>
              <span class="text-p3 font-medium text-secondary">
                Original reference for this shoot
              </span>
            </span>
          </RouterLink>
          <p v-else class="py-3 text-p3 font-medium text-secondary">No reference attached.</p>
        </section>

        <section
          aria-labelledby="review-product"
          class="flex flex-col gap-3 rounded-2xl bg-card p-4 md:p-5"
        >
          <h2 id="review-product" class="text-h6 text-brand">Products</h2>
          <div class="flex min-w-0 items-center gap-3 py-3">
            <VThumbnail
              :src="review.product.photo?.url ?? null"
              :icon-size="16"
              class="h-[54px] w-11 rounded-lg"
            />
            <div class="flex min-w-0 flex-col gap-2">
              <p class="truncate text-p2 font-semibold text-brand">{{ review.product.name }}</p>
              <p v-if="review.product.sku" class="truncate text-p3 font-medium text-secondary">
                {{ review.product.sku }}
              </p>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="review-creator"
          class="flex flex-col gap-3 rounded-2xl bg-card p-4 md:p-5"
        >
          <h2 id="review-creator" class="text-h6 text-brand">Creator</h2>
          <div v-if="creator" class="flex min-w-0 items-center gap-2 py-3">
            <VAvatar :name="creator.name" :src="creator.photoUrl" :size="36" />
            <div class="flex min-w-0 flex-col gap-[3px]">
              <p class="truncate text-p2 font-semibold text-brand">{{ creator.name }}</p>
              <p v-if="creator.role" class="text-p3 font-medium text-secondary">
                {{ creator.role }}
              </p>
            </div>
          </div>
          <p v-else class="py-3 text-p3 font-medium text-secondary">Nobody is assigned.</p>
        </section>
      </div>

      <CreatorSwitcher
        v-if="creators.length > 1 && creator"
        :creators="creators"
        :selected="creator.id"
        :progress="progress"
        @select="selectCreator"
      />

      <!-- Figma "Review workspace": the picked file and the decision on the left,
           the creator's versions on the right. -->
      <div
        v-if="creator"
        class="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-[538fr_670fr] lg:items-start"
      >
        <section
          aria-labelledby="review-feedback"
          class="flex flex-col gap-4 rounded-2xl bg-card p-4 md:p-7"
        >
          <ReviewPreview v-if="file" :file="file" @open="openFile" />
          <p
            v-else
            class="flex h-[200px] items-center justify-center rounded-xl bg-subtle p-6 text-center text-p2 font-medium text-secondary"
          >
            {{ creator.name }} hasn’t uploaded anything yet.
          </p>

          <template v-if="version">
            <div class="flex flex-col gap-3">
              <h2 id="review-feedback" class="text-h6 text-brand">Feedback for creator</h2>
              <p class="text-p3 font-medium text-secondary">
                {{
                  !canDecide
                    ? 'The deliverable is sent to the brand: decisions are final.'
                    : picked && picked.id !== version.id
                      ? `${picked.label} is approved. Approving this version picks it instead.`
                      : 'Share your notes and requested changes. The creator will be notified.'
                }}
              </p>
              <template v-if="canDecide">
                <VTextarea
                  v-model="form.feedback"
                  aria-labelledby="review-feedback"
                  placeholder="What should the creator change?"
                  :rows="5"
                  :maxlength="FEEDBACK_MAX"
                  :error="feedbackError"
                  :disabled="pending !== null"
                />
                <p class="text-p4 font-medium text-tertiary">
                  {{ form.feedback.length }} / {{ FEEDBACK_MAX }}
                </p>
              </template>
            </div>

            <!-- Figma "Modal actions". -->
            <div v-if="canDecide" class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
              <VButton
                variant="soft"
                :disabled="pending !== null"
                class="md:px-5"
                @click="decide('changes_requested')"
              >
                <VIcon name="file-view" />
                {{ pending === 'changes_requested' ? 'Sending…' : 'Request changes' }}
              </VButton>
              <VButton :disabled="pending !== null" class="md:px-5" @click="decide('approved')">
                <VIcon name="tick-01" />
                {{ pending === 'approved' ? 'Approving…' : 'Approve' }}
              </VButton>
            </div>
          </template>
        </section>

        <section
          aria-labelledby="review-versions"
          class="flex flex-col gap-4 rounded-2xl bg-card p-4 md:p-7"
        >
          <h2 id="review-versions" class="text-h6 text-brand">Versions</h2>
          <RadioGroupRoot
            v-if="creator.versions.length"
            :model-value="version?.id"
            aria-labelledby="review-versions"
            class="flex flex-col gap-4"
            @update:model-value="(value) => selectVersion(value as string)"
          >
            <ReviewVersionCard
              v-for="item in creator.versions"
              :key="item.id"
              :version="item"
              :selected="item.id === version?.id"
              :selected-file="item.id === version?.id ? (file?.id ?? null) : null"
              @select-file="
                (fileId) => {
                  if (item.id !== version?.id) selectVersion(item.id)
                  selectFile(fileId)
                }
              "
            />
          </RadioGroupRoot>
          <p
            v-else
            class="rounded-[10px] bg-subtle p-6 text-center text-p2 font-medium text-secondary"
          >
            No versions yet. They appear here once {{ creator.name }} submits for review.
          </p>
        </section>
      </div>

      <SendToBrand
        :can-send="canSend"
        :sent="sent"
        :sending="sending"
        :waiting="waiting"
        @send="send"
      />
    </template>
  </div>
</template>
