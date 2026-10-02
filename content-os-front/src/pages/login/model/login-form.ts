import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { login, useEnterSession } from '@/entities/session'
import { errorStatus } from '@/shared/api'

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

  const email = ref('')
  const password = ref('')
  const submitting = ref(false)
  // The backend sends people back here with ?error=google when Google sign-in fails.
  const error = ref(
    route.query.error === 'google' ? 'Couldn’t sign in with Google. Please try again.' : '',
  )
  const canSubmit = computed(() => !submitting.value && !!email.value && !!password.value)

  async function submit() {
    error.value = ''
    submitting.value = true
    try {
      await enter(await login({ email: email.value, password: password.value }))
    } catch (e) {
      error.value = loginErrorMessage(e)
    } finally {
      submitting.value = false
    }
  }

  return { email, password, error, canSubmit, submit }
}
