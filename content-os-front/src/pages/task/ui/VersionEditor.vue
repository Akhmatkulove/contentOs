<script setup lang="ts">
import { VButton } from '@/shared/ui/button'
import { VDropzone } from '@/shared/ui/dropzone'
import { VIcon } from '@/shared/ui/icon'
import { contentAccept } from '../model/task-page'
import type { ContentFile } from '../model/task'
import ContentFileCard from './ContentFileCard.vue'

// Not in Figma: a version with requested changes being fixed (docs/adr/0016).
// Its files can be removed and new ones added; Save sends it back to review.
const { kept, added, canSave, saving } = defineProps<{
  kept: ContentFile[]
  added: ContentFile[]
  canSave: boolean
  saving: boolean
}>()
defineEmits<{
  removeKept: [id: string]
  add: [files: File[]]
  reject: [files: File[]]
  retry: [id: string]
  discard: [id: string]
  cancel: []
  save: []
}>()
</script>

<template>
  <div class="flex flex-col gap-4">
    <VDropzone
      :accept="contentAccept"
      hint="Images or videos • upload multiple files"
      :disabled="saving"
      @select="$emit('add', $event)"
      @reject="$emit('reject', $event)"
    />
    <ul
      v-if="kept.length || added.length"
      aria-label="Files of the version"
      class="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,170px)]"
    >
      <li v-for="file in kept" :key="file.id" class="min-w-0">
        <ContentFileCard :file="file" :removable="!saving" @remove="$emit('removeKept', file.id)" />
      </li>
      <li
        v-for="file in added"
        :key="file.id"
        class="min-w-0"
        :aria-busy="file.failed || file.progress === 100 ? undefined : true"
      >
        <!-- Uploaded files show as saved ones: they join the version on Save. -->
        <ContentFileCard
          :file="file.progress === 100 ? { ...file, progress: undefined } : file"
          :removable="!saving && (!!file.failed || file.progress === 100)"
          @remove="$emit('discard', file.id)"
          @retry="$emit('retry', file.id)"
        />
      </li>
    </ul>
    <p v-else class="rounded-[10px] bg-subtle p-6 text-center text-p2 font-medium text-secondary">
      Add at least one file to send the version back.
    </p>
    <div class="flex flex-col-reverse gap-2.5 md:flex-row md:justify-end">
      <VButton variant="secondary" :disabled="saving" class="md:px-5" @click="$emit('cancel')">
        Cancel
      </VButton>
      <VButton :disabled="!canSave || saving" class="md:px-5" @click="$emit('save')">
        <VIcon name="tick-01" />
        {{ saving ? 'Saving…' : 'Save and send for review' }}
      </VButton>
    </div>
  </div>
</template>
