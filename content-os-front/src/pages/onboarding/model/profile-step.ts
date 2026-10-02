import { useMutation } from '@pinia/colada'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/entities/session'
import { errorStatus } from '@/shared/api'
import { saveAnswers, uploadPhoto } from '../api/onboarding'

export function photoErrorMessage(error: unknown): string {
  switch (errorStatus(error)) {
    case 413:
      return 'This photo is larger than 5MB.'
    case 422:
      return 'Use a JPG or PNG image.'
    default:
      return 'Couldn’t upload the photo. Please try again.'
  }
}

export function useProfileStep() {
  const router = useRouter()
  const session = useSessionStore()

  const name = ref(session.me?.name ?? '')
  const photoUrl = computed(() => session.me?.photo_url ?? null)

  // The photo is uploaded as soon as it is picked; the server crops and re-encodes it.
  const photo = useMutation({
    mutation: async (file: File) => session.set(await uploadPhoto(file)),
    meta: { toast: false },
  })

  const answers = useMutation({
    mutation: async (name: string) => {
      session.set(await saveAnswers({ name }))
      await router.push({ name: 'onboarding-review' })
    },
    meta: { toast: false },
  })

  const uploading = photo.isLoading
  const photoError = computed(() => (photo.error.value ? photoErrorMessage(photo.error.value) : ''))
  const canSubmit = computed(
    () => !!name.value.trim() && !answers.isLoading.value && !uploading.value,
  )

  return {
    name,
    photoUrl,
    uploading,
    photoError,
    upload: photo.mutate,
    canSubmit,
    failed: computed(() => !!answers.error.value),
    submit: () => answers.mutate(name.value.trim()),
  }
}
