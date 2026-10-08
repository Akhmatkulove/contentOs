<script setup lang="ts">
import type { Task } from '../model/task'

// Figma "Due metadata": the date and how soon; today and overdue in red.
const { task } = defineProps<{ task: Task }>()
</script>

<template>
  <div v-if="task.dueDate" class="flex flex-col gap-1 text-p3 font-medium whitespace-nowrap">
    <span class="text-primary">{{ task.dueDate }}</span>
    <span v-if="task.due" :class="task.due.urgent ? 'text-red-400' : 'text-secondary'">
      {{ task.due.label }}
    </span>
  </div>
  <span v-else class="text-p3 font-medium text-secondary">—</span>
</template>
