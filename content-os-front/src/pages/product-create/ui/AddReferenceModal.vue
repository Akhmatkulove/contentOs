<script setup lang="ts">
import { useId, useTemplateRef } from 'vue'
import { VButton } from '@/shared/ui/button'
import { VDropzone } from '@/shared/ui/dropzone'
import { VIcon } from '@/shared/ui/icon'
import { VInput } from '@/shared/ui/input'
import { VModal } from '@/shared/ui/modal'
import { VSegmented } from '@/shared/ui/segmented'
import { VSelect } from '@/shared/ui/select'
import { VTagsInput } from '@/shared/ui/tags-input'
import { VTextarea } from '@/shared/ui/textarea'
import { VUploadThumbnail } from '@/shared/ui/upload-thumbnail'
import {
  fileAccept,
  sourceOptions,
  typeOptions,
  useAddReferenceForm,
} from '../model/add-reference-form'
import FavoriteToggle from './FavoriteToggle.vue'
import LinkPreview from './LinkPreview.vue'

// Figma "Modal / Add reference" (desktop) and "Sheet / Add reference" (mobile).
const emit = defineEmits<{ close: [] }>()

const {
  source,
  form,
  productOptions,
  shootOptions,
  creatorOptions,
  collectionOptions,
  files,
  addFiles,
  removeFile,
  rejectFiles,
  linkPreview,
  removeLink,
  submit,
} = useAddReferenceForm()

// The submit button sits in the modal footer, outside the <form>.
const formId = useId()
const dropzone = useTemplateRef('dropzone')
</script>

<template>
  <VModal
    title="Add reference"
    description="Upload or save a new visual reference for shoots, products, and creators."
  >
    <form :id="formId" class="flex flex-col gap-3.5 md:gap-4" @submit.prevent="submit">
      <VSegmented v-model="source" :options="sourceOptions" aria-label="Reference source" />

      <template v-if="source === 'upload'">
        <VDropzone
          ref="dropzone"
          :accept="fileAccept"
          hint="Images, videos, or moodboards • upload multiple files"
          class="h-[140px] border-pink-200 md:h-28 md:border-violet-400"
          @select="addFiles"
          @reject="rejectFiles"
        />
        <!-- One scrollable row ending with "Add more"; wraps on desktop. -->
        <ul
          v-if="files.length"
          class="-mx-4 flex gap-3 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
        >
          <li v-for="item in files" :key="item.id">
            <VUploadThumbnail
              :src="item.url"
              :alt="item.file.name"
              :video="item.file.type.startsWith('video/')"
              @remove="removeFile(item.id)"
            />
          </li>
          <li>
            <VButton
              variant="ghost"
              class="aspect-[9/16] h-auto w-20 flex-col gap-1.5 rounded-xl border border-default bg-muted text-p4 font-medium md:bg-subtle"
              @click="dropzone?.open()"
            >
              <VIcon name="plus-sign" :size="18" class="text-brand" />
              Add more
            </VButton>
          </li>
        </ul>
      </template>

      <template v-else>
        <VInput
          v-model="form.link"
          label="Link"
          type="url"
          inputmode="url"
          placeholder="https://www.instagram.com/p/"
        >
          <template #prefix>
            <VIcon name="copy-link" :size="16" class="shrink-0 text-secondary" />
          </template>
        </VInput>
        <LinkPreview v-if="linkPreview" :preview="linkPreview" @remove="removeLink" />
      </template>

      <!-- Mobile: title, tags and collection take the full row; desktop: two columns. -->
      <div class="grid grid-cols-2 gap-x-3 gap-y-3.5 md:gap-x-5 md:gap-y-4">
        <VInput
          v-model="form.title"
          label="Reference title"
          placeholder="Enter reference title"
          class="col-span-2 md:col-span-1"
        />
        <VSelect
          v-model="form.type"
          :options="typeOptions"
          label="Type"
          placeholder="Select type"
        />
        <VSelect
          v-model="form.product"
          :options="productOptions"
          label="Product"
          placeholder="Select product"
          searchable
        />
        <VSelect
          v-model="form.shoot"
          :options="shootOptions"
          label="Shoot"
          placeholder="Select shoot"
          searchable
        />
        <VSelect
          v-model="form.creator"
          :options="creatorOptions"
          label="Creator"
          placeholder="Select creator"
          searchable
        />
        <VTagsInput
          v-model="form.tags"
          label="Tags"
          placeholder="Add tags (e.g. fabric, minimal, lighting)"
          class="col-span-2 md:col-span-1"
        />
        <VSelect
          v-model="form.collection"
          :options="collectionOptions"
          label="Collection"
          placeholder="Select collection"
          searchable
          class="col-span-2 md:col-span-1"
        />
      </div>

      <VTextarea
        v-model="form.notes"
        label="Notes"
        placeholder="Add notes, context, or inspiration details…"
        :rows="2"
      />

      <FavoriteToggle v-model="form.favorite" class="md:hidden" />
    </form>

    <template #footer>
      <div class="flex items-center gap-2.5">
        <FavoriteToggle v-model="form.favorite" class="hidden md:flex md:flex-1" />
        <VButton
          variant="secondary"
          class="flex-1 md:w-[150px] md:flex-none"
          @click="emit('close')"
        >
          Cancel
        </VButton>
        <VButton type="submit" :form="formId" class="flex-1 md:flex-none">
          <VIcon name="plus-sign" />
          Add reference
        </VButton>
      </div>
    </template>
  </VModal>
</template>
