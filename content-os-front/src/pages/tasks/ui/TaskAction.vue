<script setup lang="ts">
import { computed } from 'vue'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { taskAction, type Task, type TaskRole } from '../model/task'

// Figma "Row action": Review (Soft) or View (Secondary), 36 high.
// Until the review screen exists both open the shoot: Review on its Needs
// review tab, View on its Tasks tab (docs/adr/0011).
// TODO(ui): Review becomes a link to the review screen once that is designed.
const { task, role } = defineProps<{ task: Task; role: TaskRole }>()

const review = computed(() => taskAction(role, task.status) === 'review')
const to = computed(() => ({
  name: 'shoot',
  params: { id: task.shoot.id },
  query: { tab: review.value ? 'needs_review' : 'tasks' },
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
