<script setup lang="ts">
import { computed, provide } from 'vue'
import { closeModal, modalContextKey, type ModalEntry } from './modal-stack'

// One open modal: hands its open state to the VModal inside and turns
// emit('close', result) into the result of openModal().
const { entry } = defineProps<{ entry: ModalEntry }>()

provide(modalContextKey, {
  open: computed(() => entry.open),
  dismiss: () => closeModal(entry.id),
})
</script>

<template>
  <component
    :is="entry.component"
    v-bind="entry.props"
    @close="(result?: unknown) => closeModal(entry.id, result)"
  />
</template>
