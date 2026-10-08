<script setup lang="ts">
import { computed } from 'vue'
import { VAvatar } from '@/shared/ui/avatar'
import type { Task } from '../model/task'

// Figma "Assignee": the first assignee's avatar and name, "+N" for the rest.
const { task } = defineProps<{ task: Task }>()

const first = computed(() => task.assignees[0])
const more = computed(() => task.assignees.length - 1)
</script>

<template>
  <div v-if="first" class="flex min-w-0 items-center gap-1.5">
    <VAvatar :name="first.name" :src="first.photo_url" :size="24" />
    <span class="truncate text-p3 font-medium text-primary">
      {{ first.name || 'Unnamed' }}<template v-if="more"> +{{ more }}</template>
    </span>
  </div>
  <span v-else class="text-p3 font-medium text-secondary">Unassigned</span>
</template>
