<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { ReferenceCard } from '@/entities/reference'
import { VButton } from '@/shared/ui/button'
import { VDropzone } from '@/shared/ui/dropzone'
import { VIcon } from '@/shared/ui/icon'
import { VInput } from '@/shared/ui/input'
import { VNotificationButton } from '@/shared/ui/notification-button'
import { VSelect } from '@/shared/ui/select'
import { VTagsInput } from '@/shared/ui/tags-input'
import { VTextarea } from '@/shared/ui/textarea'
import { VUploadThumbnail } from '@/shared/ui/upload-thumbnail'
import { statusOptions, useProductCreateForm } from '../model/product-create-form'
import { photoAccept } from '../model/product-photos'
import SectionCard from './SectionCard.vue'

const {
  form,
  errors,
  photos,
  addPhotos,
  removePhoto,
  rejectPhotos,
  references,
  addReference,
  cancel,
  submit,
} = useProductCreateForm()
const dropzone = useTemplateRef('dropzone')

const emptyListClass =
  'hidden h-[117px] items-center justify-center rounded-[20px] bg-subtle p-8 text-center text-p1 font-medium text-secondary md:flex'
</script>

<template>
  <!-- Bottom padding on mobile clears the fixed action bar. -->
  <form class="flex flex-col gap-4 pb-20 md:gap-5 md:pb-0" @submit.prevent="submit">
    <!-- TODO(ui): mobile topbar in AppLayout (Figma "CMS / Mobile / Topbar", Back variant); move the back link and the bell there. -->
    <div class="mb-8 flex items-center justify-between gap-4 md:mb-0">
      <RouterLink
        :to="{ name: 'products' }"
        class="flex items-center gap-1.5 text-p3 font-medium text-secondary transition-colors hover:text-brand"
      >
        <VIcon name="arrow-left-02-sharp" :size="14" />
        Back to products
      </RouterLink>
      <VNotificationButton unread class="lg:hidden" />
    </div>

    <header class="flex items-center justify-between gap-4">
      <div class="flex min-w-0 flex-col gap-1.5">
        <h1 class="text-h3 text-brand">Add product</h1>
        <p class="max-w-[247px] text-p2 font-medium text-secondary md:max-w-none">
          Product details, photos, references, notes and deliverables.
        </p>
      </div>
      <div class="hidden shrink-0 items-center gap-2.5 md:flex">
        <VButton variant="secondary" @click="cancel">Cancel</VButton>
        <VButton type="submit">
          <VIcon name="tick-01" />
          Create product
        </VButton>
      </div>
    </header>

    <div class="grid gap-4 md:gap-5 xl:grid-cols-[minmax(0,1fr)_374px]">
      <SectionCard title="Product details">
        <div class="grid gap-3 md:grid-cols-2 md:gap-x-5 md:gap-y-4">
          <VInput
            v-model="form.name"
            label="Product name"
            required
            placeholder="Enter product name"
            :error="errors.name"
          />
          <VTagsInput v-model="form.tags" label="Tags" placeholder="Add tags" />
          <VInput v-model="form.collection" label="Collection" placeholder="Enter collection" />
          <VInput v-model="form.category" label="Category" placeholder="Enter category" />
          <VInput v-model="form.sku" label="SKU" placeholder="SKU" />
          <VSelect
            v-model="form.status"
            :options="statusOptions"
            label="Status"
            placeholder="Select status"
          />
          <VTextarea
            v-model="form.about"
            label="About"
            required
            placeholder="About"
            :error="errors.about"
            class="md:col-span-2"
          />
        </div>
      </SectionCard>

      <SectionCard title="Notes">
        <VTextarea
          v-model="form.notes"
          label="Notes"
          placeholder="Enter notes"
          :rows="2"
          class="xl:flex-1"
        />
      </SectionCard>
    </div>

    <SectionCard title="Photos" required>
      <VDropzone
        ref="dropzone"
        :accept="photoAccept"
        hint="Images • upload multiple files"
        class="h-[140px] border-pink-200 md:h-28 md:border-violet-400"
        @select="addPhotos"
        @reject="rejectPhotos"
      />
      <!-- TODO(ui): error state of VDropzone, if Figma has one; until then only the message. -->
      <p v-if="errors.photos" class="text-p3 font-medium text-red-400">{{ errors.photos }}</p>
      <!-- Mobile: one scrollable row ending with "Add more"; desktop: wraps. -->
      <ul
        v-if="photos.length"
        class="-mx-4 flex gap-3 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
      >
        <li v-for="photo in photos" :key="photo.id">
          <VUploadThumbnail
            :src="photo.url"
            :alt="photo.file.name"
            @remove="removePhoto(photo.id)"
          />
        </li>
        <li class="md:hidden">
          <VButton
            variant="ghost"
            class="aspect-[9/16] h-auto w-20 flex-col gap-1.5 rounded-xl border border-default bg-subtle text-p4 font-medium"
            @click="dropzone?.open()"
          >
            <VIcon name="plus-sign" :size="18" class="text-brand" />
            Add more
          </VButton>
        </li>
      </ul>
    </SectionCard>

    <SectionCard
      title="References"
      description="Attach references from your reference bank to guide the creative direction."
    >
      <template #action>
        <VButton variant="secondary" class="w-full md:hidden" @click="addReference">
          <VIcon name="plus-sign" />
          Add reference
        </VButton>
        <VButton class="hidden md:inline-flex" @click="addReference">
          <VIcon name="plus-sign" />
          Add reference
        </VButton>
      </template>
      <!-- TODO(ui): grid of the product's references — the card is from Figma, the grid isn't designed yet. -->
      <ul v-if="references.length" class="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        <li v-for="reference in references" :key="reference.id">
          <ReferenceCard :reference="reference" />
        </li>
      </ul>
      <p v-else :class="emptyListClass">The References you've added will be displayed here</p>
    </SectionCard>

    <!-- Deliverables hidden for now. TODO(ui): deliverable form and rows — no design yet.
    <SectionCard
      title="Deliverables"
      description="Plan and track the content pieces required for this product."
    >
      <template #action>
        <VButton variant="secondary" class="w-full md:hidden">
          <VIcon name="plus-sign" />
          Add deliverable
        </VButton>
        <VButton class="hidden md:inline-flex">
          <VIcon name="plus-sign" />
          Add deliverable
        </VButton>
      </template>
      <p :class="emptyListClass">The Deliverables you've added will be displayed here</p>
    </SectionCard>
    -->

    <!-- On mobile the actions stay above the tab bar. -->
    <div
      class="fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] flex gap-2 bg-card px-4 pt-4 pb-6 md:hidden"
    >
      <VButton variant="secondary" class="flex-1" @click="cancel">Cancel</VButton>
      <VButton type="submit" class="flex-1">
        <VIcon name="tick-01" />
        Create product
      </VButton>
    </div>
  </form>
</template>
