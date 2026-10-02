import { useMutation } from '@pinia/colada'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { login, useEnterSession, type Credentials } from '@/entities/session'
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
  // The backend sends people back here with ?error=google when Google sign-in fails.
  const googleFailed = ref(route.query.error === 'google')

  const {
    mutate,
    isLoading,
    error: loginError,
  } = useMutation({
    // Navigation is part of the mutation, so the button stays disabled until the page changes.
    mutation: async (credentials: Credentials) => enter(await login(credentials)),
    meta: { toast: false },
  })

  const error = computed(() => {
    if (loginError.value) return loginErrorMessage(loginError.value)
    return googleFailed.value ? 'Couldn’t sign in with Google. Please try again.' : ''
  })
  const canSubmit = computed(() => !isLoading.value && !!email.value && !!password.value)

  function submit() {
    googleFailed.value = false
    mutate({ email: email.value, password: password.value })
  }

  return { email, password, error, canSubmit, submit }
}
