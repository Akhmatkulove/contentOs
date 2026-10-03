import { useMutation } from '@pinia/colada'
import { useRegleSchema } from '@regle/schemas'
import * as v from 'valibot'
import { computed, reactive } from 'vue'
import { signup, useEnterSession, type Credentials } from '@/entities/session'
import { errorStatus, type Schemas } from '@/shared/api'

// Same limit as SignupRequest on the backend.
const credentials = v.object({
  email: v.pipe(v.string(), v.email('Enter a valid email address.')),
  password: v.pipe(v.string(), v.minLength(8, 'Use at least 8 characters.')),
}) satisfies v.GenericSchema<Schemas['SignupRequest']>

// Checks what can be checked before asking the server.
export const signupSchema = v.pipe(
  v.object({ ...credentials.entries, passwordRepeat: v.string() }),
  v.forward(
    v.partialCheck(
      [['password'], ['passwordRepeat']],
      (input) => input.password === input.passwordRepeat,
      'Passwords don’t match.',
    ),
    ['passwordRepeat'],
  ),
)

// Which field the server's refusal belongs to, and what to say there.
export function signupErrorMessage(error: unknown): { email: string; form: string } {
  switch (errorStatus(error)) {
    case 409:
      return { email: 'This email is already registered. Log in instead.', form: '' }
    case 422:
      return { email: 'Enter a valid email address.', form: '' }
    case 429:
      return { email: '', form: 'Too many attempts. Please wait a few minutes and try again.' }
    default:
      return { email: '', form: 'Something went wrong. Please try again.' }
  }
}

export function useSignupForm() {
  const enter = useEnterSession()

  const form = reactive({ email: '', password: '', passwordRepeat: '' })
  // rewardEarly: a field turns valid as soon as it is fixed, but turns invalid only on submit.
  const { r$ } = useRegleSchema(form, signupSchema, {
    rewardEarly: true,
    clearExternalErrorsOnChange: true,
  })

  const { mutate, reset, isLoading, error } = useMutation({
    mutation: async (credentials: Credentials) => enter(await signup(credentials)),
    onError: (e) => {
      const { email } = signupErrorMessage(e)
      if (email) r$.$setExternalErrors({ email: [{ $message: email }] })
    },
    meta: { toast: false },
  })

  const errors = computed(() => ({
    email: r$.email.$errors[0] ?? '',
    password: r$.password.$errors[0] ?? '',
    passwordRepeat: r$.passwordRepeat.$errors[0] ?? '',
    form: error.value ? signupErrorMessage(error.value).form : '',
  }))
  const canSubmit = computed(
    () => !isLoading.value && !!form.email && !!form.password && !!form.passwordRepeat,
  )

  async function submit() {
    reset()
    const { valid, data } = await r$.$validate()
    if (valid) mutate({ email: data.email, password: data.password })
  }

  return { form, errors, canSubmit, submit }
}
