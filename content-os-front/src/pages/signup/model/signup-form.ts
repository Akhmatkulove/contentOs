import { computed, reactive, ref } from 'vue'
import { signup, useEnterSession } from '@/entities/session'
import { errorStatus } from '@/shared/api'

// Same limit as SignupRequest on the backend.
export const MIN_PASSWORD_LENGTH = 8

export interface SignupErrors {
  email: string
  password: string
  passwordRepeat: string
  form: string
}

// Checks what can be checked before asking the server.
export function validatePasswords(
  password: string,
  passwordRepeat: string,
): Pick<SignupErrors, 'password' | 'passwordRepeat'> {
  return {
    password:
      password.length < MIN_PASSWORD_LENGTH
        ? `Use at least ${MIN_PASSWORD_LENGTH} characters.`
        : '',
    passwordRepeat: passwordRepeat !== password ? 'Passwords don’t match.' : '',
  }
}

// Which field the server's refusal belongs to, and what to say there.
export function signupErrorMessage(error: unknown): Pick<SignupErrors, 'email' | 'form'> {
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

  const email = ref('')
  const password = ref('')
  const passwordRepeat = ref('')
  const submitting = ref(false)
  const errors = reactive<SignupErrors>({ email: '', password: '', passwordRepeat: '', form: '' })
  const canSubmit = computed(
    () => !submitting.value && !!email.value && !!password.value && !!passwordRepeat.value,
  )

  async function submit() {
    Object.assign(
      errors,
      { email: '', form: '' },
      validatePasswords(password.value, passwordRepeat.value),
    )
    if (errors.password || errors.passwordRepeat) return
    submitting.value = true
    try {
      await enter(await signup({ email: email.value, password: password.value }))
    } catch (e) {
      Object.assign(errors, signupErrorMessage(e))
    } finally {
      submitting.value = false
    }
  }

  return { email, password, passwordRepeat, errors, canSubmit, submit }
}
