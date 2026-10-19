<script setup lang="ts">
import { computed } from 'vue'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { taskAction, type Task, type TaskRole } from '../model/task'

// Figma "Row action": Review (Soft) or View (Secondary), 36 high.
// View opens the task page (docs/adr/0012), Review the deliverable's review (0015).
const { task, role } = defineProps<{ task: Task; role: TaskRole }>()

const review = computed(() => taskAction(role, task.status) === 'review')
const to = computed(() => ({
  name: review.value ? 'task-review' : 'task',
  params: { id: task.id },
}))
</script>

<template>
  <VButton
    as-child
    :variant="review ? 'soft' : 'secondary'"
    size="36"
    class="gap-1.5 px-3 text-p3 font-medium [&>svg]:size-3.5"
  >
    <RouterLink :to="to" :aria-label="`${review ? 'Review' : 'View'} ${task.name}`">
      <VIcon :name="review ? 'file-view' : 'link-square-01'" />
      {{ review ? 'Review' : 'View' }}
    </RouterLink>
  </VButton>
</template>
