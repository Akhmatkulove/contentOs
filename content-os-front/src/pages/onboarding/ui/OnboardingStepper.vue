<script setup lang="ts">
import { VIcon } from '@/shared/ui/icon'

const { current } = defineProps<{ current: number }>()

const steps = ['Your role', 'Profile', 'Done']
</script>

<template>
  <ol class="flex w-full lg:w-[622px]">
    <li
      v-for="(label, index) in steps"
      :key="label"
      :aria-current="index === current ? 'step' : undefined"
      class="flex flex-1 last:flex-none"
    >
      <div class="flex w-[100px] flex-col items-center gap-3 lg:w-[178px]">
        <span
          :class="[
            'flex size-9 items-center justify-center rounded-full text-p1 font-semibold tracking-normal',
            index <= current ? 'bg-violet-400 text-white' : 'bg-neutral-300 text-neutral-600',
          ]"
        >
          <VIcon v-if="index < current" name="tick-01" :size="18" />
          <template v-else>{{ index + 1 }}</template>
        </span>
        <span
          :class="[
            'text-p2 font-medium tracking-normal',
            index <= current ? 'text-violet-500' : 'text-neutral-600',
          ]"
        >
          {{ label }}
        </span>
      </div>

      <span
        v-if="index < steps.length - 1"
        aria-hidden="true"
        :class="[
          '-mx-6 mt-[18px] h-px flex-1 lg:-mx-[71px]',
          index < current ? 'bg-violet-400' : 'bg-neutral-300',
        ]"
      />
    </li>
  </ol>
</template>
