import { useMutation } from '@pinia/colada'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/entities/session'

// A failed logout keeps the user where they are; the global handler shows the toast.
export function useLogout() {
  const router = useRouter()
  const session = useSessionStore()

  const { mutate, isLoading } = useMutation({
    mutation: async () => {
      await session.logout()
      await router.push({ name: 'login' })
    },
  })

  return { logout: () => mutate(), loggingOut: isLoading }
}
