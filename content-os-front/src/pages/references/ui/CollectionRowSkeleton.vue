<script setup lang="ts">
import ReferenceCardSkeleton from './ReferenceCardSkeleton.vue'
</script>

<!--
  A CollectionRow while it loads: a header bar and a row of card skeletons.
  Desktop lays them out like the page's grid (auto-fill, minmax(200px, 1fr))
  with one visible row, which gives the same card width CollectionRow measures;
  mobile shows two cards and a peek of the third, like the real row.
-->
<template>
  <div aria-hidden="true" class="flex flex-col gap-4 md:gap-5">
    <div class="flex min-h-9 animate-pulse items-center motion-reduce:animate-none">
      <div class="flex h-lh items-center text-h6">
        <div class="h-[0.75lh] w-40 rounded-md bg-muted" />
      </div>
    </div>
    <!-- Extra cards fall into zero-height rows and get clipped. -->
    <div
      class="-mx-4 flex gap-3 overflow-hidden px-4 md:mx-0 md:grid md:auto-rows-[0] md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] md:grid-rows-[auto] md:gap-x-5 md:gap-y-0 md:px-0"
    >
      <ReferenceCardSkeleton
        v-for="n in 8"
        :key="n"
        class="w-[calc((100%-0.75rem)/2.25)] shrink-0 md:w-auto"
      />
    </div>
  </div>
</template>
