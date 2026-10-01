<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { VIcon } from '@/shared/ui/icon'
import type { IconName } from '@/shared/ui/icon'
import ApplicationState from './ApplicationState.vue'
import OnboardingStepper from './OnboardingStepper.vue'

const router = useRouter()

// Comes from the backend once applications are stored there.
const status = ref<'pending' | 'approved'>('pending')

const reviewSteps: { label: string; icon: IconName; done: boolean }[] = [
  { label: 'Application received', icon: 'tick-01', done: true },
  { label: 'Review in progress', icon: 'clock-01', done: true },
  { label: 'Workspace access', icon: 'user', done: false },
]
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1040px] flex-col items-center gap-6 lg:gap-10">
    <OnboardingStepper :current="3" />

    <ApplicationState
      v-if="status === 'approved'"
      icon="checkmark-circle-01"
      title="You’re all set!"
      :description="'Welcome to Creator Lab.\nLet’s start creating.'"
      hide-support
    >
      <button type="button" @click="router.push({ name: 'home' })">Go to dashboard</button>
    </ApplicationState>

    <ApplicationState
      v-else
      icon="file-view"
      tone="yellow"
      title="Your application is under review"
      description="Your details are with our team. You can return here to check for updates."
    >
      <template #details>
        <ul class="flex w-full flex-col gap-3 text-left lg:gap-4">
          <li
            v-for="step in reviewSteps"
            :key="step.label"
            :class="[
              'flex items-center gap-3 text-p2 leading-5 font-medium tracking-normal',
              step.done ? 'text-violet-500' : 'text-neutral-600',
            ]"
          >
            <VIcon
              :name="step.icon"
              :size="18"
              :class="step.done ? 'text-violet-400' : 'text-neutral-600'"
            />
            {{ step.label }}
          </li>
        </ul>
      </template>

      <button type="button">View my application</button>
      <button type="button">Edit my details</button>
    </ApplicationState>
  </div>
</template>
