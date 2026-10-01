<script setup lang="ts">
import { ref } from 'vue'
import { VInput, VPasswordInput } from '@/shared/ui/input'
import billboardUrl from './assets/billboard.png'
import googleUrl from './assets/google.svg'
import logoMarkUrl from './assets/logo-mark.svg'
import logoTextUrl from './assets/logo-text.svg'

const email = ref('')
const password = ref('')
</script>

<template>
  <main class="flex min-h-dvh flex-col bg-white lg:flex-row">
    <div class="relative h-[250px] shrink-0 lg:order-last lg:h-auto lg:w-3/5">
      <img
        :src="billboardUrl"
        alt=""
        class="absolute inset-0 size-full object-cover lg:object-[52%_50%]"
      />
      <div class="absolute top-10 right-10 hidden items-center gap-2 lg:flex">
        <img :src="logoMarkUrl" alt="" width="18.8922" height="19.3486" />
        <img :src="logoTextUrl" alt="Creator Lab" width="138.796" height="19.6693" />
      </div>
    </div>

    <div
      class="relative -mt-6 flex flex-1 flex-col rounded-t-3xl bg-white px-4 pt-6 pb-4 lg:mt-0 lg:rounded-none lg:p-10"
    >
      <div class="hidden h-10 items-center justify-end gap-4 lg:flex">
        <p class="text-p3 font-medium text-neutral-600">Don't have an account?</p>
        <button type="button">Sign up</button>
      </div>

      <div
        class="mx-auto flex w-full max-w-[440px] flex-1 flex-col gap-5 lg:justify-center lg:gap-7"
      >
        <div class="flex flex-col gap-2 lg:gap-3">
          <h1 class="text-h4 tracking-normal text-violet-500 lg:text-h3">Welcome back</h1>
          <p class="text-p3 font-medium tracking-normal text-neutral-600 lg:text-p1">
            Log in to your Creator Lab account.
          </p>
        </div>

        <form class="flex flex-col gap-5 lg:gap-7" @submit.prevent>
          <div class="flex flex-col gap-4 lg:gap-5">
            <VInput
              v-model="email"
              label="Email"
              type="email"
              name="email"
              autocomplete="email"
              placeholder="you@domain.com"
            />

            <VPasswordInput
              v-model="password"
              label="Password"
              name="password"
              autocomplete="current-password"
              placeholder="Enter your password"
            />

            <div class="flex h-5 items-center justify-end">
              <a href="#" class="text-p3 font-medium text-violet-400">Forgot password?</a>
            </div>
          </div>

          <button type="submit">Log in</button>
        </form>

        <div class="flex items-center gap-4">
          <div class="h-px flex-1 bg-neutral-300" />
          <span class="text-p3 font-medium text-neutral-600">or continue with</span>
          <div class="h-px flex-1 bg-neutral-300" />
        </div>

        <button type="button">
          <img :src="googleUrl" alt="" width="17.5794" height="17.9382" />
          Continue with Google
        </button>

        <p class="flex h-5 items-center justify-center gap-1 text-p3">
          <span class="font-medium text-neutral-600">Don't have an account?</span>
          <a href="#" class="font-semibold text-violet-400">Sign up</a>
        </p>
      </div>
    </div>
  </main>
</template>
