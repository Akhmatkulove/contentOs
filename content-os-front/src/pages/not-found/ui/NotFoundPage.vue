<template>
  <main class="flex min-h-screen flex-col items-center justify-center gap-4">
    <h1 class="text-3xl font-bold">404</h1>
    <RouterLink :to="{ name: 'home' }" class="underline">На главную</RouterLink>
  </main>
</template>
