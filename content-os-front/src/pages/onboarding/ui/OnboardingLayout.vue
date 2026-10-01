<script setup lang="ts">
import logoMarkUrl from './assets/logo-mark.svg'
import logoTextUrl from './assets/logo-text.svg'
</script>

<template>
  <div
    class="flex min-h-dvh flex-col bg-neutral-200 px-4 pt-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:px-12 lg:pt-10 lg:pb-10"
  >
    <header class="flex h-5 items-center justify-between lg:h-10">
      <div class="flex items-center gap-[5.6px] lg:gap-2">
        <img
          :src="logoMarkUrl"
          alt=""
          class="h-[13.544px] w-[13.225px] lg:h-[19.349px] lg:w-[18.892px]"
        />
        <img
          :src="logoTextUrl"
          alt="Creator Lab"
          class="h-[13.768px] w-[97.165px] lg:h-[19.668px] lg:w-[138.795px]"
        />
      </div>

      <button type="button" class="text-p2 font-medium tracking-normal text-neutral-600">
        Log out
      </button>
    </header>

    <main class="mt-7 flex flex-1 flex-col lg:mt-[84px]">
      <RouterView />
    </main>
  </div>
</template>
