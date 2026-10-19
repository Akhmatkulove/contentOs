<script setup lang="ts">
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VStatus } from '@/shared/ui/status'
import type { ContentVersion } from '../model/task'
import ContentFileCard from './ContentFileCard.vue'

// Figma "Version / V1": the version's name, upload time and review state;
// opens to the art director's feedback and its files. With changes requested
// the author may fix it (`editable`); while `editing`, the editor comes in the
// slot and takes the files' place (docs/adr/0016).
const {
  version,
  defaultOpen = false,
  editable = false,
  editing = false,
} = defineProps<{
  version: ContentVersion
  defaultOpen?: boolean
  editable?: boolean
  editing?: boolean
}>()
defineEmits<{ edit: [] }>()
</script>

<template>
  <CollapsibleRoot
    :default-open="defaultOpen"
    class="rounded-[10px] border border-default data-[state=open]:border-violet-400"
  >
    <CollapsibleTrigger
      class="group flex w-full items-center gap-6 rounded-[10px] p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-violet-300 md:p-[18px]"
    >
      <span class="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <span class="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
          <span class="text-p3 font-semibold break-words text-primary">{{ version.label }}</span>
          <span v-if="version.author" class="text-p3 font-medium text-primary">
            · {{ version.author }}
          </span>
          <span class="text-p4 font-medium text-secondary">{{ version.uploaded }}</span>
        </span>
        <VStatus v-if="version.status" :tone="version.status.tone">
          {{ version.status.label }}
        </VStatus>
      </span>
      <VIcon
        name="arrow-down-01-sharp"
        :size="16"
        class="shrink-0 text-secondary transition-transform group-data-[state=open]:rotate-180"
      />
    </CollapsibleTrigger>
    <CollapsibleContent>
      <!-- The art director's feedback on this version (docs/adr/0015). -->
      <div
        v-if="version.feedback"
        class="mx-4 mb-4 flex flex-col gap-1 rounded-[10px] bg-subtle p-3 md:mx-[18px]"
      >
        <p class="text-p3 font-medium text-secondary">Feedback from the art director</p>
        <p class="text-p2 font-medium whitespace-pre-line break-words text-primary">
          {{ version.feedback }}
        </p>
      </div>
      <div v-if="editing" class="px-4 pb-4 md:px-[18px] md:pb-[18px]">
        <slot />
      </div>
      <template v-else>
        <ul
          class="grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-[repeat(auto-fill,170px)] md:px-[18px] md:pb-[18px]"
        >
          <li v-for="file in version.files" :key="file.id" class="min-w-0">
            <ContentFileCard :file="file" />
          </li>
        </ul>
        <!-- Not in Figma: the way to fix the version. -->
        <div v-if="editable" class="px-4 pb-4 md:px-[18px] md:pb-[18px]">
          <VButton variant="secondary" class="md:px-5" @click="$emit('edit')">
            <VIcon name="edit-02" />
            Edit files
          </VButton>
        </div>
      </template>
    </CollapsibleContent>
  </CollapsibleRoot>
</template>
