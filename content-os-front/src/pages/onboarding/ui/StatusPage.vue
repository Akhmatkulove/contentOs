<script setup lang="ts">
import { VIcon, type IconName } from '@/shared/ui/icon'
import { useReopen } from '../model/reopen'
import { useStatusPolling } from '../model/status-polling'
import ApplicationState from './ApplicationState.vue'
import OnboardingStepper from './OnboardingStepper.vue'

// The router only lets pending and rejected applications in here, so "approved"
// means the decision came while this page was open: that is when the welcome shows.
const { status } = useStatusPolling()
const { reopen, reopening, failed: reopenFailed } = useReopen()

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
      <button type="button" @click="$router.push({ name: 'home' })">Go to dashboard</button>
    </ApplicationState>

    <ApplicationState
      v-else-if="status === 'rejected'"
      icon="multiplication-sign"
      tone="red"
      title="Your application wasn’t approved"
      description="You can update your details and send the application again."
    >
      <p v-if="reopenFailed" role="alert" class="text-p3 font-medium text-red-400">
        Something went wrong. Please try again.
      </p>
      <button type="button" :disabled="reopening" @click="reopen">Update and resend</button>
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

      <p v-if="reopenFailed" role="alert" class="text-p3 font-medium text-red-400">
        Something went wrong. Please try again.
      </p>
      <button type="button" :disabled="reopening" @click="reopen">Edit my details</button>
    </ApplicationState>
  </div>
</template>
