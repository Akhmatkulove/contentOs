import { useMutation } from '@pinia/colada'
import { computed } from 'vue'
import { useSessionStore } from '@/entities/session'
import { errorStatus } from '@/shared/api'
import { submitApplication } from '../api/onboarding'

export type ReviewView = 'draft' | 'sending' | 'sent' | 'error'

export function useSubmitApplication() {
  const session = useSessionStore()

  const { mutate, reset, status, asyncStatus, error } = useMutation({
    mutation: async () => session.set(await submitApplication()),
    meta: { toast: false },
  })

  // The review screen is the mutation's state: reset() takes it back to the form.
  const view = computed<ReviewView>(() => {
    if (asyncStatus.value === 'loading') return 'sending'
    if (status.value === 'success') return 'sent'
    if (status.value === 'error') return 'error'
    return 'draft'
  })
  // The backend limits resends so the review chat can't be flooded.
  const tooMany = computed(() => errorStatus(error.value) === 429)

  return { view, tooMany, submit: () => mutate(), backToDraft: reset }
}
