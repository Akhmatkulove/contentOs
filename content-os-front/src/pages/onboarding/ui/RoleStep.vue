<script setup lang="ts">
import { ref } from 'vue'
import { VIcon } from '@/shared/ui/icon'
import type { IconName } from '@/shared/ui/icon'
import OnboardingStepper from './OnboardingStepper.vue'

type Role = 'creator' | 'manager' | 'brand'

const roleOptions: { value: Role; icon: IconName; title: string; description: string }[] = [
  {
    value: 'creator',
    icon: 'user',
    title: 'Creator / Mobilograph',
    description: 'Create and upload content\nfor brands',
  },
  {
    value: 'manager',
    icon: 'user-group',
    title: 'Manager / Art Director',
    description: 'Plan, review and manage\ncontent',
  },
  {
    value: 'brand',
    icon: 'folder-01',
    title: 'Brand',
    description: 'Work with creators\nand manage campaigns',
  },
]

const role = ref<Role | null>(null)
</script>

<template>
  <form
    class="mx-auto flex w-full max-w-[1040px] flex-1 flex-col items-center gap-6 lg:flex-none lg:gap-10"
    @submit.prevent
  >
    <OnboardingStepper :current="0" />

    <div class="flex flex-col gap-2 text-center lg:gap-3">
      <h1 class="text-h4 font-semibold tracking-normal text-violet-500 lg:text-[36px]/[42px]">
        What’s your role?
      </h1>
      <p class="text-[13px]/[1.375] font-medium text-neutral-600 lg:text-[16px]">
        This helps us tailor your experience.
      </p>
    </div>

    <fieldset class="flex w-full flex-col gap-2 lg:flex-row lg:gap-6">
      <legend class="sr-only">Your role</legend>

      <label
        v-for="option in roleOptions"
        :key="option.value"
        :class="[
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-center has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-violet-300 lg:h-[280px] lg:flex-1 lg:gap-5 lg:rounded-[20px] lg:p-7',
          role === option.value ? 'border-violet-400 bg-violet-100' : 'border-neutral-300 bg-white',
        ]"
      >
        <input v-model="role" type="radio" name="role" :value="option.value" class="sr-only" />

        <VIcon :name="option.icon" class="size-6 text-violet-400 lg:size-8" />

        <span class="flex flex-col gap-1 lg:gap-2.5">
          <span class="text-[16px]/[1.333] font-semibold text-violet-500 lg:text-[18px]">
            {{ option.title }}
          </span>
          <span
            class="text-[13px]/[1.4] font-medium whitespace-pre-line text-neutral-600 lg:text-[15px]"
          >
            {{ option.description }}
          </span>
        </span>

        <span
          :class="[
            'flex size-5 items-center justify-center rounded-full border bg-white',
            role === option.value ? 'border-violet-400' : 'border-neutral-600',
          ]"
        >
          <span v-if="role === option.value" class="size-2.5 rounded-full bg-violet-400" />
        </span>
      </label>
    </fieldset>

    <div class="mt-auto flex w-full justify-end lg:mt-0">
      <button
        type="submit"
        :disabled="!role"
        class="flex h-10 w-full items-center justify-center gap-2 rounded-3xl bg-violet-400 px-5 text-p2 font-semibold text-white disabled:opacity-50 lg:w-[208px]"
      >
        Continue
        <VIcon name="arrow-right-02-sharp" :size="16" />
      </button>
    </div>
  </form>
</template>
