import { useMutation } from '@pinia/colada'
import { useRegleSchema } from '@regle/schemas'
import * as v from 'valibot'
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { login, useEnterSession, type Credentials } from '@/entities/session'
import { errorStatus, type Schemas } from '@/shared/api'

// Checks what can be checked before asking the server. The password has no length rule:
// it may predate the current signup limit, and the server checks it anyway.
export const loginSchema = v.object({
  email: v.pipe(v.string(), v.email('Enter a valid email address.')),
  password: v.string(),
}) satisfies v.GenericSchema<Schemas['LoginRequest']>

export function loginErrorMessage(error: unknown): string {
  switch (errorStatus(error)) {
    case 401:
      return 'Invalid email or password.'
    case 429:
      return 'Too many attempts. Please wait a few minutes and try again.'
    default:
      return 'Something went wrong. Please try again.'
  }
}

export function useLoginForm() {
  const route = useRoute()
  const enter = useEnterSession()

  const form = reactive({ email: '', password: '' })
  // rewardEarly: a field turns valid as soon as it is fixed, but turns invalid only on submit.
  const { r$ } = useRegleSchema(form, loginSchema, { rewardEarly: true })
  // The backend sends people back here with ?error=google when Google sign-in fails.
  const googleFailed = ref(route.query.error === 'google')

  const {
    mutate,
    reset,
    isLoading,
    error: loginError,
  } = useMutation({
    // Navigation is part of the mutation, so the button stays disabled until the page changes.
    mutation: async (credentials: Credentials) => enter(await login(credentials)),
    meta: { toast: false },
  })

  const errors = computed(() => ({
    email: r$.email.$errors[0] ?? '',
    form: loginError.value
      ? loginErrorMessage(loginError.value)
      : googleFailed.value
        ? 'Couldn’t sign in with Google. Please try again.'
        : '',
  }))
  const canSubmit = computed(() => !isLoading.value && !!form.email && !!form.password)

  async function submit() {
    googleFailed.value = false
    reset()
    const { valid, data } = await r$.$validate()
    if (valid) mutate(data)
  }

  return { form, errors, canSubmit, submit }
}
