<script setup lang="ts">
import HostedModal from './hosted-modal.vue'
import { modals } from './modal-stack'
</script>

<!-- Mount once in App.vue; open modals with openModal() from this module. -->
<template>
  <HostedModal v-for="entry in modals" :key="entry.id" :entry="entry" />
</template>
