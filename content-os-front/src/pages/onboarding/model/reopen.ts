import { useMutation } from '@pinia/colada'
import { computed } from 'vue'
import { useEnterSession } from '@/entities/session'
import { reopenApplication } from '../api/onboarding'

// "Edit my details" from the sent and status screens: the application goes back to
// onboarding with its answers, and the user lands on the review step to change them.
export function useReopen() {
  const enter = useEnterSession()

  const { mutate, isLoading, error } = useMutation({
    mutation: async () => enter(await reopenApplication()),
    meta: { toast: false },
  })

  return { reopen: () => mutate(), reopening: isLoading, failed: computed(() => !!error.value) }
}
