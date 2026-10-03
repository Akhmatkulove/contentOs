<script setup lang="ts">
import { continueWithGoogle } from '@/entities/session'
import { VInput, VPasswordInput } from '@/shared/ui/input'
import { useLoginForm } from '../model/login-form'
import googleUrl from './assets/google.svg'

const { form, errors, canSubmit, submit } = useLoginForm()
</script>

<template>
  <div class="hidden h-10 items-center justify-end gap-4 lg:flex">
    <p class="text-p3 font-medium text-neutral-600">Don't have an account?</p>
    <RouterLink :to="{ name: 'signup' }">Sign up</RouterLink>
  </div>

  <div class="mx-auto flex w-full max-w-[440px] flex-1 flex-col gap-5 lg:justify-center lg:gap-7">
    <div class="flex flex-col gap-2 lg:gap-3">
      <h1 class="text-h4 tracking-normal text-violet-500 lg:text-h3">Welcome back</h1>
      <p class="text-p3 font-medium tracking-normal text-neutral-600 lg:text-p1">
        Log in to your Creator Lab account.
      </p>
    </div>

    <form class="flex flex-col gap-5 lg:gap-7" @submit.prevent="submit">
      <div class="flex flex-col gap-4 lg:gap-5">
        <VInput
          v-model="form.email"
          label="Email"
          type="email"
          name="email"
          autocomplete="email"
          placeholder="you@domain.com"
          :error="errors.email"
        />

        <VPasswordInput
          v-model="form.password"
          label="Password"
          name="password"
          autocomplete="current-password"
          placeholder="Enter your password"
        />

        <div class="flex h-5 items-center justify-end">
          <a href="#" class="text-p3 font-medium text-violet-400">Forgot password?</a>
        </div>
      </div>

      <p v-if="errors.form" role="alert" class="text-p3 font-medium text-red-400">
        {{ errors.form }}
      </p>

      <button type="submit" :disabled="!canSubmit">Log in</button>
    </form>

    <div class="flex items-center gap-4">
      <div class="h-px flex-1 bg-neutral-300" />
      <span class="text-p3 font-medium text-neutral-600">or continue with</span>
      <div class="h-px flex-1 bg-neutral-300" />
    </div>

    <button type="button" @click="continueWithGoogle">
      <img :src="googleUrl" alt="" width="17.5794" height="17.9382" />
      Continue with Google
    </button>

    <p class="flex h-5 items-center justify-center gap-1 text-p3">
      <span class="font-medium text-neutral-600">Don't have an account?</span>
      <RouterLink :to="{ name: 'signup' }" class="font-semibold text-violet-400"
        >Sign up</RouterLink
      >
    </p>
  </div>
</template>
