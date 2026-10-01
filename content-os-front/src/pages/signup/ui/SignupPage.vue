<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { googleSignInUrl, homeRoute, signup, useSessionStore } from '@/entities/session'
import { errorStatus } from '@/shared/api'
import { VInput, VPasswordInput } from '@/shared/ui/input'
import googleUrl from './assets/google.svg'

// Same limit as SignupRequest on the backend.
const MIN_PASSWORD_LENGTH = 8

const router = useRouter()
const session = useSessionStore()

const email = ref('')
const password = ref('')
const passwordRepeat = ref('')
const submitting = ref(false)
const errors = reactive({ email: '', password: '', passwordRepeat: '', form: '' })

function validate() {
  errors.password =
    password.value.length < MIN_PASSWORD_LENGTH
      ? `Use at least ${MIN_PASSWORD_LENGTH} characters.`
      : ''
  errors.passwordRepeat = passwordRepeat.value !== password.value ? 'Passwords don’t match.' : ''
  return !errors.password && !errors.passwordRepeat
}

async function submit() {
  Object.assign(errors, { email: '', form: '' })
  if (!validate()) return
  submitting.value = true
  try {
    const me = await signup({ email: email.value, password: password.value })
    session.set(me)
    await router.push(homeRoute(me))
  } catch (e) {
    const status = errorStatus(e)
    if (status === 409) errors.email = 'This email is already registered. Log in instead.'
    else if (status === 422) errors.email = 'Enter a valid email address.'
    else if (status === 429)
      errors.form = 'Too many attempts. Please wait a few minutes and try again.'
    else errors.form = 'Something went wrong. Please try again.'
  } finally {
    submitting.value = false
  }
}

function continueWithGoogle() {
  window.location.assign(googleSignInUrl)
}
</script>

<template>
  <div class="hidden h-10 items-center justify-end gap-4 lg:flex">
    <p class="text-p3 font-medium text-neutral-600">Already have an account?</p>
    <RouterLink :to="{ name: 'login' }">Log in</RouterLink>
  </div>

  <div class="mx-auto flex w-full max-w-[440px] flex-1 flex-col gap-5 lg:justify-center lg:gap-7">
    <div class="flex flex-col gap-2 lg:gap-3">
      <h1 class="text-h4 tracking-normal text-violet-500 lg:text-h3">Create your account</h1>
      <p class="text-p3 font-medium tracking-normal text-neutral-600 lg:text-p1">
        Sign up to start using Creator Lab.
      </p>
    </div>

    <form class="flex flex-col gap-5 lg:gap-7" @submit.prevent="submit">
      <div class="flex flex-col gap-4 lg:gap-5">
        <VInput
          v-model="email"
          label="Email"
          type="email"
          name="email"
          autocomplete="email"
          placeholder="you@domain.com"
          :error="errors.email"
        />

        <VPasswordInput
          v-model="password"
          label="Password"
          name="password"
          autocomplete="new-password"
          placeholder="Enter your password"
          :error="errors.password"
        />

        <VPasswordInput
          v-model="passwordRepeat"
          label="Repeat password"
          name="password-repeat"
          autocomplete="new-password"
          placeholder="Enter your password again"
          :error="errors.passwordRepeat"
        />
      </div>

      <p v-if="errors.form" role="alert" class="text-p3 font-medium text-red-400">
        {{ errors.form }}
      </p>

      <button type="submit" :disabled="submitting || !email || !password || !passwordRepeat">
        Sign up
      </button>
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
      <span class="font-medium text-neutral-600">Already have an account?</span>
      <RouterLink :to="{ name: 'login' }" class="font-semibold text-violet-400">Log in</RouterLink>
    </p>
  </div>
</template>
