<script setup lang="ts">
import { VButton } from '@/shared/ui/button'
import { VDropzone } from '@/shared/ui/dropzone'
import { VIcon } from '@/shared/ui/icon'
import { VInput } from '@/shared/ui/input'
import { VStatus } from '@/shared/ui/status'
import { VThumbnail } from '@/shared/ui/thumbnail'
import { contentAccept, useTaskPage, VERSION_TITLE_MAX } from '../model/task-page'
import ContentFileCard from './ContentFileCard.vue'
import ContentVersionCard from './ContentVersionCard.vue'

// The route's :id.
const { id } = defineProps<{ id: string }>()

const {
  task,
  loading,
  error,
  notFound,
  status,
  dueDate,
  canUpload,
  canEdit,
  versions,
  draftFiles,
  pending,
  addFiles,
  rejectFiles,
  removeFile,
  retry,
  discard,
  title,
  canSubmit,
  saving,
  save,
  submitting,
  submit,
} = useTaskPage(() => id)
</script>

<!--
  Figma "My tasks / Creator / View task" and "… / on review". The art director
  gets the same page without uploads (docs/adr/0012).
  TODO(api): format badges ("Reel", "15–30s") — a task has no format yet.
  TODO(ui): the references block under Ready content.
-->
<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <RouterLink
      :to="{ name: 'tasks' }"
      class="flex items-center gap-1.5 self-start text-p3 font-medium text-secondary transition-colors hover:text-brand"
    >
      <VIcon name="arrow-left-02-sharp" :size="14" />
      Back to My tasks
    </RouterLink>

    <p v-if="loading" class="py-10 text-center text-p2 font-medium text-secondary">Loading…</p>

    <p v-else-if="!task" class="py-10 text-center text-p2 font-medium text-secondary">
      {{
        notFound
          ? 'This task doesn’t exist or it isn’t yours.'
          : error
            ? 'Couldn’t load the task. Please try again.'
            : ''
      }}
    </p>

    <template v-else>
      <!-- Figma "Shoot header". -->
      <header class="flex items-center justify-between gap-4">
        <div class="flex min-w-0 flex-col gap-2">
          <h1 class="text-h4 break-words text-primary md:text-h3">{{ task.name }}</h1>
          <VStatus v-if="status" :tone="status.tone" class="self-start">
            {{ status.label }}
          </VStatus>
        </div>
        <!-- The art director reviews each assignee's work and changes the task
             in the shoot's form. -->
        <div v-if="canEdit" class="flex shrink-0 flex-wrap gap-2.5">
          <VButton as-child variant="secondary" class="md:px-5">
            <RouterLink :to="{ name: 'shoot-edit', params: { id: task.shoot.id } }">
              <VIcon name="edit-02" />
              Edit task
            </RouterLink>
          </VButton>
          <VButton as-child class="md:px-5">
            <RouterLink :to="{ name: 'task-review', params: { id: task.id } }">
              <VIcon name="file-view" />
              Review
            </RouterLink>
          </VButton>
        </div>
      </header>

      <div class="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-2">
        <section
          aria-labelledby="task-products"
          class="flex flex-col gap-4 rounded-2xl bg-card p-4 md:p-5"
        >
          <h2 id="task-products" class="text-h6 text-primary">Products in this task</h2>
          <div class="flex min-w-0 items-center gap-3 p-3">
            <VThumbnail
              :src="task.product.photo?.url ?? null"
              :icon-size="16"
              class="h-[54px] w-11 rounded-lg"
            />
            <div class="flex min-w-0 flex-col gap-2">
              <p class="truncate text-p2 font-semibold text-primary">{{ task.product.name }}</p>
              <p v-if="task.product.sku" class="truncate text-p3 font-medium text-secondary">
                {{ task.product.sku }}
              </p>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="task-details"
          class="flex flex-col gap-4 rounded-2xl bg-card p-4 md:p-5"
        >
          <h2 id="task-details" class="text-h6 text-primary">Task details</h2>
          <dl class="grid grid-cols-1 gap-4 py-2 sm:grid-cols-[repeat(2,200px)] sm:gap-5 md:py-5">
            <div class="flex min-w-0 items-center gap-3">
              <VIcon name="calendar-02" :size="20" class="shrink-0 text-secondary" />
              <div class="flex min-w-0 flex-col gap-1 font-medium">
                <dt class="text-p3 text-secondary">Shoot</dt>
                <dd class="text-p2 break-words text-primary">
                  <RouterLink
                    :to="{ name: 'shoot', params: { id: task.shoot.id } }"
                    class="transition-colors hover:text-link"
                  >
                    {{ task.shoot.name }}
                  </RouterLink>
                </dd>
              </div>
            </div>
            <div class="flex min-w-0 items-center gap-3">
              <VIcon name="calendar-02" :size="20" class="shrink-0 text-secondary" />
              <div class="flex min-w-0 flex-col gap-1 font-medium">
                <dt class="text-p3 text-secondary">Date</dt>
                <dd class="flex flex-wrap items-center gap-x-2.5 text-p2 text-primary">
                  {{ dueDate?.label ?? '—' }}
                  <span
                    v-if="dueDate?.hint"
                    :class="['text-p3', dueDate.hint.urgent ? 'text-red-400' : 'text-secondary']"
                  >
                    {{ dueDate.hint.label }}
                  </span>
                </dd>
              </div>
            </div>
          </dl>
        </section>
      </div>

      <!-- Figma "Card / Photos": every upload is a version, newest first. -->
      <section
        aria-labelledby="ready-content"
        class="flex flex-col gap-6 rounded-2xl bg-card p-4 md:gap-8 md:p-5"
      >
        <div class="flex flex-col">
          <h2 id="ready-content" class="text-p1 font-semibold text-primary">Ready content</h2>
          <p class="text-p3 font-medium text-secondary">
            {{
              canUpload
                ? 'Upload multiple photos or videos for this task'
                : 'Photos and videos the creator uploaded for this task'
            }}
          </p>
        </div>

        <p
          v-if="!versions.length && !canUpload"
          class="rounded-[10px] bg-subtle p-6 text-center text-p2 font-medium text-secondary"
        >
          Nothing uploaded yet.
        </p>

        <div v-if="versions.length" class="flex flex-col gap-3">
          <ContentVersionCard
            v-for="(version, index) in versions"
            :key="version.id"
            :version="version"
            :default-open="index === 0"
          />
        </div>

        <!-- The draft of the next version: files gather here until Submit for
             review. The first one is V1; after it the next may get a name. -->
        <div v-if="canUpload" class="flex flex-col gap-4">
          <VInput
            v-if="versions.length"
            v-model="title"
            label="Version title"
            placeholder="For example, V1.01"
            :maxlength="VERSION_TITLE_MAX"
            :disabled="submitting"
          />
          <VDropzone
            :accept="contentAccept"
            hint="Images or videos • upload multiple files"
            :disabled="submitting"
            @select="addFiles"
            @reject="rejectFiles"
          />
          <ul
            v-if="draftFiles.length || pending.length"
            aria-label="Files of the next version"
            class="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,170px)]"
          >
            <li v-for="file in draftFiles" :key="file.id" class="min-w-0">
              <ContentFileCard
                :file="file"
                :removable="!submitting"
                @remove="removeFile(file.id)"
              />
            </li>
            <li
              v-for="file in pending"
              :key="file.id"
              class="min-w-0"
              :aria-busy="file.failed ? undefined : true"
            >
              <ContentFileCard
                :file="file"
                :removable="!!file.failed"
                @remove="discard(file.id)"
                @retry="retry(file.id)"
              />
            </li>
          </ul>
        </div>
      </section>

      <!-- Figma "Actions": Save draft keeps the next version's title; its files
           are in the draft as soon as they upload. -->
      <div v-if="canUpload" class="flex flex-col-reverse gap-2.5 md:flex-row md:justify-end">
        <VButton
          variant="secondary"
          :disabled="!canSubmit || saving || submitting"
          class="md:px-5"
          @click="save"
        >
          {{ saving ? 'Saving…' : 'Save draft' }}
        </VButton>
        <VButton :disabled="!canSubmit || saving || submitting" class="md:px-5" @click="submit">
          <VIcon name="tick-01" />
          {{ submitting ? 'Submitting…' : 'Submit for review' }}
        </VButton>
      </div>
    </template>
  </div>
</template>
