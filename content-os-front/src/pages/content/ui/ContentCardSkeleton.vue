<!--
  A ContentCard while it loads: the same surface, 9:16 preview, two lines and the
  footer row, so the cards take its place without the page jumping.
-->
<template>
  <div
    aria-hidden="true"
    class="flex min-w-0 animate-pulse flex-col gap-2 overflow-hidden rounded-xl border border-default bg-card p-2.5 motion-reduce:animate-none md:gap-3 md:rounded-none md:border-0 md:bg-transparent md:p-0"
  >
    <div class="aspect-[9/16] rounded-lg bg-muted md:rounded-2xl" />

    <div class="flex flex-col gap-2 md:gap-1.5">
      <div class="flex h-lh items-center text-p2 md:text-p1">
        <div class="h-[0.75lh] w-3/4 rounded-md bg-muted" />
      </div>
      <div class="flex h-lh items-center text-p3">
        <div class="h-[0.75lh] w-1/2 rounded-md bg-muted" />
      </div>
    </div>

    <div class="flex items-center justify-between">
      <div class="h-4 w-16 rounded-md bg-muted" />
      <div class="h-[26px] w-20 rounded-full bg-muted" />
    </div>
  </div>
</template>
