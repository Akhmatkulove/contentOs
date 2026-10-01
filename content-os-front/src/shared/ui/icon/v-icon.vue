<script setup lang="ts">
import spriteUrl from './sprite.svg?url'
import type { IconName } from './icon-names'

const { name, size = 24 } = defineProps<{
  name: IconName
  size?: number | string
}>()
</script>

<template>
  <svg :width="size" :height="size" aria-hidden="true" class="shrink-0">
    <use :href="`${spriteUrl}#${name}`" />
  </svg>
</template>
