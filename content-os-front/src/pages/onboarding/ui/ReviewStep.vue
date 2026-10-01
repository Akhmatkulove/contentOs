<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/entities/session'
import { errorStatus } from '@/shared/api'
import { VIcon } from '@/shared/ui/icon'
import { submitApplication } from '../api/onboarding'
import { useReopen } from '../model/reopen'
import { roleTitle as titleOf } from '../model/roles'
import ApplicationState from './ApplicationState.vue'
import OnboardingStepper from './OnboardingStepper.vue'

const router = useRouter()
const session = useSessionStore()
const { reopen, reopening } = useReopen()

const roleTitle = computed(() => titleOf(session.me?.role))

const status = ref<'draft' | 'sending' | 'sent' | 'error'>('draft')
// The backend limits resends so the review chat can't be flooded.
const tooMany = ref(false)

async function submit() {
  status.value = 'sending'
  try {
    session.set(await submitApplication())
    status.value = 'sent'
  } catch (e) {
    tooMany.value = errorStatus(e) === 429
    status.value = 'error'
  }
}
</script>

<template>
  <form
    class="mx-auto flex w-full max-w-[1040px] flex-1 flex-col items-center gap-6 lg:flex-none lg:gap-10"
    @submit.prevent="submit"
  >
    <OnboardingStepper :current="status === 'sent' ? 3 : 2" />

    <ApplicationState
      v-if="status === 'sending'"
      icon="clock-01"
      title="Sending your application…"
      description="We’re saving your details. This will only take a moment."
    >
      <button type="button" disabled>Sending…</button>
    </ApplicationState>

    <ApplicationState
      v-else-if="status === 'sent'"
      icon="checkmark-circle-01"
      tone="mint"
      title="Your application is in!"
      description="Thanks for introducing yourself. Check back on the status page to see when it’s been reviewed."
    >
      <button type="button" @click="router.push({ name: 'onboarding-status' })">
        Track application
      </button>
      <button type="button" :disabled="reopening" @click="reopen">Edit my details</button>
    </ApplicationState>

    <ApplicationState
      v-else-if="status === 'error'"
      icon="multiplication-sign"
      tone="red"
      title="Your application wasn’t sent"
      :description="
        tooMany
          ? 'You’ve sent your application several times recently. Your answers are saved — please try again in an hour.'
          : 'Something interrupted the submission. Your answers are saved — please try again.'
      "
    >
      <button v-if="!tooMany" type="button" @click="submit">Try again</button>
      <button type="button" @click="status = 'draft'">Back to application</button>
    </ApplicationState>

    <template v-else>
      <div class="flex flex-col gap-2 text-center lg:gap-3">
        <h1 class="text-h4 font-semibold tracking-normal text-violet-500 lg:text-[36px]/[42px]">
          Ready to join Creator Lab?
        </h1>
        <p class="text-[12px]/[1.375] font-medium text-balance text-neutral-600 lg:text-[16px]">
          Take a moment to check your details before you send your application.
        </p>
      </div>

      <div
        class="flex w-full flex-col gap-4 rounded-2xl bg-white p-5 lg:w-[720px] lg:gap-6 lg:rounded-[20px] lg:p-8"
      >
        <div class="flex items-center gap-3 lg:gap-4">
          <img
            v-if="session.me?.photo_url"
            :src="session.me.photo_url"
            alt=""
            class="size-12 shrink-0 rounded-full object-cover lg:size-16"
          />
          <span
            v-else
            class="flex size-12 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-400 lg:size-16"
          >
            <VIcon name="user" class="size-5 lg:size-6" />
          </span>

          <div class="flex min-w-0 flex-col gap-1 lg:gap-1.5">
            <p class="truncate text-[18px]/[1.273] font-semibold text-violet-500 lg:text-[22px]">
              {{ session.me?.name }}
            </p>
            <p class="text-[13px]/[1.4286] font-medium text-neutral-600 lg:text-[14px]">
              {{ roleTitle }}
            </p>
          </div>
        </div>

        <dl class="flex flex-col gap-3 text-p2 leading-5 font-medium tracking-normal lg:gap-5">
          <div class="flex items-center justify-between gap-4">
            <dt class="text-neutral-600">Email</dt>
            <dd class="truncate text-violet-500">{{ session.me?.email }}</dd>
          </div>
          <div class="flex items-center justify-between gap-4">
            <dt class="text-neutral-600">Role</dt>
            <dd class="text-violet-500">{{ roleTitle }}</dd>
          </div>
        </dl>

        <div
          class="flex items-start gap-2.5 rounded-xl bg-violet-100 p-3 text-violet-400 lg:items-center lg:gap-3 lg:p-4"
        >
          <VIcon name="file-view" class="size-[18px] lg:size-5" />
          <p class="text-[13px]/[1.4286] font-medium lg:text-[14px]">
            We’ll review your application. You can follow its status here in Creator Lab.
          </p>
        </div>
      </div>

      <div class="mt-auto flex w-full gap-3 lg:mt-0 lg:w-[720px] lg:justify-between">
        <button type="button" @click="router.push({ name: 'onboarding-profile' })">Back</button>
        <button type="submit">Submit application</button>
      </div>
    </template>
  </form>
</template>
