<script setup lang="ts">
import billboardUrl from './assets/billboard.png'
import logoMarkUrl from './assets/logo-mark.svg'
import logoTextUrl from './assets/logo-text.svg'
</script>

<template>
  <main class="flex min-h-dvh flex-col bg-white lg:flex-row">
    <div class="relative h-[250px] shrink-0 lg:order-last lg:h-auto lg:w-3/5">
      <img
        :src="billboardUrl"
        alt=""
        class="absolute inset-0 size-full object-cover lg:object-[52%_50%]"
      />
      <div class="absolute top-10 right-10 hidden items-center gap-2 lg:flex">
        <img :src="logoMarkUrl" alt="" width="18.8922" height="19.3486" />
        <img :src="logoTextUrl" alt="Creator Lab" width="138.796" height="19.6693" />
      </div>
    </div>

    <div
      class="relative -mt-6 flex flex-1 flex-col rounded-t-3xl bg-white px-4 pt-6 pb-4 lg:mt-0 lg:rounded-none lg:p-10"
    >
      <RouterView />
    </div>
  </main>
</template>
