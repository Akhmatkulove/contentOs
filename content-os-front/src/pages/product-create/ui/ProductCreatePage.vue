<script setup lang="ts">
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VInput } from '@/shared/ui/input'
import { VNotificationButton } from '@/shared/ui/notification-button'
import { VSelect } from '@/shared/ui/select'
import { VTagsInput } from '@/shared/ui/tags-input'
import { VTextarea } from '@/shared/ui/textarea'
import { statusOptions, useProductCreateForm } from '../model/product-create-form'
import SectionCard from './SectionCard.vue'

const { form, cancel, submit } = useProductCreateForm()

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
          <VInput v-model="form.name" label="Product name" placeholder="Enter product name" />
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
          <VTextarea v-model="form.about" label="About" placeholder="About" class="md:col-span-2" />
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

    <SectionCard title="Photos">
      <!-- TODO(ui): VDropzone (Figma "CMS / Shared / Dropzone") — file picking and drag & drop;
           uploaded files go below it as VUploadThumbnail (Figma "CMS / Shared / Upload thumbnail"). -->
      <button
        type="button"
        class="flex h-[140px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-400 bg-violet-100/20 px-5 py-3 text-center md:h-28"
      >
        <VIcon name="image-02" :size="26" class="text-brand" />
        <span class="text-p2 font-semibold text-brand">
          <span class="md:hidden">Choose files to upload</span>
          <span class="hidden md:inline">Drag and drop files here or browse</span>
        </span>
        <span class="text-p3 font-medium text-secondary">Images • upload multiple files</span>
      </button>
    </SectionCard>

    <SectionCard
      title="References"
      description="Attach references from your reference bank to guide the creative direction."
    >
      <!-- TODO(ui): reference picker (from the reference bank) — no design yet. -->
      <template #action>
        <VButton variant="secondary" class="w-full md:hidden">
          <VIcon name="plus-sign" />
          Add reference
        </VButton>
        <VButton class="hidden md:inline-flex">
          <VIcon name="plus-sign" />
          Add reference
        </VButton>
      </template>
      <p :class="emptyListClass">The References you've added will be displayed here</p>
    </SectionCard>

    <SectionCard
      title="Deliverables"
      description="Plan and track the content pieces required for this product."
    >
      <!-- TODO(ui): deliverable form and rows — no design yet. -->
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
