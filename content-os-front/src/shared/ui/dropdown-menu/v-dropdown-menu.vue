<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from 'reka-ui'

// Figma "Dropdown / productActions / Open": a list of actions under a trigger.
// The trigger goes in #trigger (a VButton); items are VDropdownMenuItem.
// Reka gives focus handling, arrow keys, typeahead and Escape.
const { align = 'start' } = defineProps<{ align?: 'start' | 'center' | 'end' }>()
</script>

<template>
  <DropdownMenuRoot :modal="false">
    <DropdownMenuTrigger as-child>
      <slot name="trigger" />
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        :align="align"
        :side-offset="8"
        :collision-padding="16"
        class="z-50 flex w-74 max-w-[calc(100vw-32px)] flex-col gap-0.5 rounded-xl border border-default bg-card p-2 shadow-[0_8px_24px_rgb(33_20_59/0.13)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
      >
        <slot />
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
