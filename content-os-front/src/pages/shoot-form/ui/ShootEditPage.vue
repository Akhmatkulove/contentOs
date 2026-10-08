<script setup lang="ts">
import { computed } from 'vue'
import { useShoot } from '@/entities/shoot'
import { fromShoot } from '../model/shoot-initial'
import ShootForm from './ShootForm.vue'

// Edit shoot: the create form filled with the saved shoot (docs/adr/0008).
// Only its author edits it; the server answers 404 to anyone else.
const { id } = defineProps<{ id: string }>()

const { data: shoot, error, isLoading } = useShoot(() => id)
// Built once the shoot has loaded: the form starts from it and then owns its state.
const editing = computed(() =>
  shoot.value?.can_edit ? { id, initial: fromShoot(shoot.value) } : undefined,
)
</script>

<template>
  <p v-if="isLoading && !shoot" class="py-10 text-center text-p2 font-medium text-secondary">
    Loading…
  </p>
  <p v-else-if="!editing" class="py-10 text-center text-p2 font-medium text-secondary">
    {{
      shoot || error?.status === 404
        ? 'This shoot doesn’t exist or you can’t edit it.'
        : 'Couldn’t load the shoot. Please try again.'
    }}
  </p>
  <!-- Keyed by the shoot: the form reads its starting state once. -->
  <ShootForm v-else :key="id" :editing="editing" />
</template>
