<script setup lang="ts">
import { VIcon } from '@/shared/ui/icon'
import { VInput } from '@/shared/ui/input'
import { useProfileStep } from '../model/profile-step'
import OnboardingStepper from './OnboardingStepper.vue'

const { form, nameError, photoUrl, uploading, photoError, upload, canSubmit, failed, submit } =
  useProfileStep()

function onPhotoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const photo = input.files?.[0]
  // Cleared so that picking the same file again still fires change.
  input.value = ''
  if (photo) upload(photo)
}
</script>

<template>
  <form
    class="mx-auto flex w-full max-w-[1040px] flex-1 flex-col items-center gap-6 lg:flex-none lg:gap-10"
    @submit.prevent="submit"
  >
    <OnboardingStepper :current="1" />

    <div class="flex flex-col gap-2 text-center lg:gap-3">
      <h1 class="text-h4 font-semibold tracking-normal text-violet-500 lg:text-[36px]/[42px]">
        Tell us about yourself
      </h1>
      <p class="text-[13px]/[1.375] font-medium text-neutral-600 lg:text-[16px]">
        This information will be visible to your team.
      </p>
    </div>

    <div
      class="flex w-full flex-col items-center gap-5 rounded-2xl bg-white p-5 lg:w-[720px] lg:flex-row lg:gap-10 lg:rounded-[20px] lg:p-10"
    >
      <div class="flex w-[180px] flex-col items-center gap-3">
        <p class="text-p2 leading-5 font-semibold tracking-normal text-violet-500">Profile photo</p>

        <!-- The whole avatar and the caption below it open the file picker. -->
        <label class="group flex cursor-pointer flex-col items-center gap-3">
          <img
            v-if="photoUrl"
            :src="photoUrl"
            alt=""
            class="size-[88px] rounded-full object-cover lg:size-28"
          />
          <span
            v-else
            class="flex size-[88px] items-center justify-center rounded-full bg-violet-100 text-violet-400 lg:size-28"
          >
            <VIcon name="user" class="size-8 lg:size-10" />
          </span>

          <span
            class="text-p2 leading-5 font-medium tracking-normal text-violet-400 group-has-[:focus-visible]:underline"
          >
            {{ uploading ? 'Uploading…' : 'Upload a photo' }}
          </span>
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png"
            class="sr-only"
            :disabled="uploading"
            @change="onPhotoChange"
          />
        </label>

        <p
          v-if="photoError"
          role="alert"
          class="text-p3 leading-[18px] font-medium tracking-normal text-red-400"
        >
          {{ photoError }}
        </p>
        <p v-else class="text-p3 leading-[18px] font-medium tracking-normal text-neutral-600">
          JPG, PNG up to 5MB
        </p>
      </div>

      <VInput
        v-model="form.name"
        label="Your name"
        name="name"
        autocomplete="name"
        placeholder="Enter your name"
        :error="nameError"
        class="lg:flex-1"
      />
    </div>

    <p v-if="failed" role="alert" class="text-p3 font-medium text-red-400">
      Couldn’t save your answers. Please try again.
    </p>

    <div class="mt-auto flex w-full gap-3 lg:mt-0 lg:w-[720px] lg:justify-between">
      <button type="button" @click="$router.push({ name: 'onboarding-role' })">Back</button>
      <button type="submit" :disabled="!canSubmit">Continue</button>
    </div>
  </form>
</template>
