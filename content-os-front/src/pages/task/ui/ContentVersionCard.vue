<script setup lang="ts">
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui'
import { VIcon } from '@/shared/ui/icon'
import { VStatus } from '@/shared/ui/status'
import type { ContentVersion } from '../model/task'
import ContentFileCard from './ContentFileCard.vue'

// Figma "Version / V1": the version's name, upload time and review state;
// opens to its files.
const { version, defaultOpen = false } = defineProps<{
  version: ContentVersion
  defaultOpen?: boolean
}>()
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
      <ul
        class="grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-[repeat(auto-fill,170px)] md:px-[18px] md:pb-[18px]"
      >
        <li v-for="file in version.files" :key="file.id" class="min-w-0">
          <ContentFileCard :file="file" />
        </li>
      </ul>
    </CollapsibleContent>
  </CollapsibleRoot>
</template>
