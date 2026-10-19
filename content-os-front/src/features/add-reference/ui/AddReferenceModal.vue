<script setup lang="ts">
import { useMutation } from '@pinia/colada'
import { computed, toValue, useId, useTemplateRef } from 'vue'
import { useCollectionNames } from '@/entities/collection'
import { VButton } from '@/shared/ui/button'
import { VCombobox } from '@/shared/ui/combobox'
import { VDropzone } from '@/shared/ui/dropzone'
import { VIcon } from '@/shared/ui/icon'
import { VInput } from '@/shared/ui/input'
import { VModal } from '@/shared/ui/modal'
import { VSegmented } from '@/shared/ui/segmented'
import { VSelect } from '@/shared/ui/select'
import { VTagsInput } from '@/shared/ui/tags-input'
import { VTextarea } from '@/shared/ui/textarea'
import { VUploadThumbnail } from '@/shared/ui/upload-thumbnail'
import type { AddReferenceOptions } from '../model/add-reference'
import {
  COLLECTION_MAX,
  fileAccept,
  productOptions,
  sourceOptions,
  typeOptions,
  useAddReferenceForm,
} from '../model/add-reference-form'
import type { ReferenceDraft } from '../model/reference-draft'
import FavoriteToggle from './FavoriteToggle.vue'
import LinkPreview from './LinkPreview.vue'

// Figma "Modal / Add reference" (desktop) and "Sheet / Add reference" (mobile).
// From a product being created, product and collection come from it; in the
// pool the product is picked, the collection picked or typed, and the reference saved here.
const { options } = defineProps<{ options: AddReferenceOptions }>()

// Closes with the new draft (already saved when `options.save` is given);
// nothing when cancelled.
const emit = defineEmits<{ close: [draft?: ReferenceDraft] }>()

const {
  source,
  form,
  errors,
  files,
  addFiles,
  removeFile,
  rejectFiles,
  chooseType,
  loading,
  markLoaded,
  linkPreview,
  removeLink,
  submit,
} = useAddReferenceForm()

const products = computed(() => productOptions(toValue(options.products) ?? []))
// Suggestions for Collection; a new name is created on save (docs/adr/0014).
const collections = useCollectionNames()

// A failed save keeps the modal open with everything filled in; the global
// handler shows the error toast.
const { mutateAsync: save, isLoading: saving } = useMutation({
  mutation: (draft: ReferenceDraft) => options.save!(draft),
})

async function onSubmit() {
  if (saving.value) return
  const draft = submit()
  if (!draft) return
  if (options.save) {
    try {
      await save(draft)
    } catch {
      return
    }
  }
  emit('close', draft)
}

// The submit button sits in the modal footer, outside the <form>.
const formId = useId()
const dropzone = useTemplateRef('dropzone')
</script>

<template>
  <VModal
    title="Add reference"
    description="Upload or save a new visual reference for shoots, products, and creators."
  >
    <!-- novalidate: the browser's own check of type="url" would block submit
         before ours and show its popup instead of the field error. -->
    <form :id="formId" novalidate class="flex flex-col gap-3.5 md:gap-4" @submit.prevent="onSubmit">
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
        <p v-if="errors.files" class="text-p3 font-medium text-red-400">{{ errors.files }}</p>
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
              @load="markLoaded(item.id)"
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
          :error="errors.link"
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
          :model-value="form.type"
          :options="typeOptions"
          label="Type"
          placeholder="Select type"
          @update:model-value="chooseType"
        />

        <template v-if="options.fixed">
          <!-- Taken from the product, so not editable here. -->
          <VInput :model-value="options.fixed.product" label="Product" disabled />
          <VInput :model-value="options.creator" label="Creator" disabled />
        </template>
        <template v-else>
          <VSelect
            v-model="form.productId"
            :options="products"
            label="Product"
            placeholder="Select product"
            searchable
            search-placeholder="Search products…"
          />
          <!-- TODO(api): Shoot — ReferenceCreate takes no shoot; enable once it does. -->
          <VSelect
            :model-value="undefined"
            :options="[]"
            label="Shoot"
            placeholder="Select shoot"
            disabled
          />
          <!-- The author is whoever adds the reference. -->
          <VInput :model-value="options.creator" label="Creator" disabled />
        </template>

        <VTagsInput
          v-model="form.tags"
          label="Tags"
          placeholder="Add tags (e.g. fabric, minimal, lighting)"
          class="col-span-2 md:col-span-1"
        />
        <VInput
          v-if="options.fixed"
          :model-value="options.fixed.collection"
          label="Collection"
          placeholder="No collection"
          disabled
          class="col-span-2 md:col-span-1"
        />
        <VCombobox
          v-else
          v-model="form.collection"
          :options="collections"
          label="Collection"
          placeholder="Select or create collection"
          :maxlength="COLLECTION_MAX"
          class="col-span-2 md:col-span-1"
        />
      </div>

      <VTextarea
        v-model="form.notes"
        label="Notes"
        placeholder="Add notes, context, or inspiration details…"
        :rows="2"
      />

      <FavoriteToggle v-if="options.save" v-model="form.favorite" class="md:hidden" />
    </form>

    <template #footer>
      <div class="flex items-center gap-2.5 md:justify-end">
        <FavoriteToggle
          v-if="options.save"
          v-model="form.favorite"
          class="hidden md:flex md:flex-1"
        />
        <VButton
          variant="secondary"
          :disabled="saving"
          class="flex-1 md:w-[150px] md:flex-none"
          @click="emit('close')"
        >
          Cancel
        </VButton>
        <VButton
          type="submit"
          :form="formId"
          :disabled="loading || saving"
          class="flex-1 md:flex-none"
        >
          <VIcon name="plus-sign" />
          {{ saving ? 'Adding…' : 'Add reference' }}
        </VButton>
      </div>
    </template>
  </VModal>
</template>
