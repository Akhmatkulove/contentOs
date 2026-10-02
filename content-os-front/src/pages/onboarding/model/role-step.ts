import { useMutation } from '@pinia/colada'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore, type Role } from '@/entities/session'
import { saveAnswers } from '../api/onboarding'

export function useRoleStep() {
  const router = useRouter()
  const session = useSessionStore()

  const role = ref<Role | null>(session.me?.role ?? null)

  const { mutate, isLoading, error } = useMutation({
    mutation: async (role: Role) => {
      session.set(await saveAnswers({ role }))
      await router.push({ name: 'onboarding-profile' })
    },
    meta: { toast: false },
  })

  const canSubmit = computed(() => !!role.value && !isLoading.value)

  function submit() {
    if (role.value) mutate(role.value)
  }

  return { role, canSubmit, failed: computed(() => !!error.value), submit }
}
