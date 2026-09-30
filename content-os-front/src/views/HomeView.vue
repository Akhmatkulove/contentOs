<script setup lang="ts">
import { useCounterStore } from '@/stores/counter'

const counter = useCounterStore()
</script>

<template>
  <main class="flex min-h-screen flex-col items-center justify-center gap-4">
    <h1 class="text-3xl font-bold">Content OS</h1>
    <button class="btn" @click="counter.increment">count: {{ counter.count }}</button>
  </main>
</template>

<style scoped lang="scss">
.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  background: #111;
  color: #fff;

  &:hover {
    opacity: 0.85;
  }
}
</style>
