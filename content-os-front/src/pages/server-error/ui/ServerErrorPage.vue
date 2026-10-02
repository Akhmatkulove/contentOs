<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// Where the visitor was going when the server failed; retrying goes there again.
const from = computed(() => {
  const value = route.query.from
  return typeof value === 'string' && value.startsWith('/') ? value : '/'
})

function retry() {
  router.replace(from.value)
}
</script>

<template>
  <main class="flex min-h-screen flex-col items-center justify-center gap-4">
    <h1 class="text-h3">500</h1>
    <p class="text-p2 text-neutral-700">Сервер не отвечает. Попробуйте ещё раз.</p>
    <button type="button" class="underline" @click="retry">Повторить</button>
  </main>
</template>
