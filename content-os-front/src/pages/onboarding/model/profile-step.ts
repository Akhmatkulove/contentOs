import { useMutation } from '@pinia/colada'
import { useRegleSchema } from '@regle/schemas'
import * as v from 'valibot'
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/entities/session'
import { errorStatus, type Schemas } from '@/shared/api'
import { saveAnswers, uploadPhoto } from '../api/onboarding'

// Same rules as Name in OnboardingUpdate on the backend.
export const profileSchema = v.object({
  name: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('Enter your name.'),
    v.maxLength(100, 'Use at most 100 characters.'),
  ),
}) satisfies v.GenericSchema<Schemas['OnboardingUpdate']>

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

  const form = reactive({ name: session.me?.name ?? '' })
  // rewardEarly: the field turns valid as soon as it is fixed, but turns invalid only on submit.
  const { r$ } = useRegleSchema(form, profileSchema, { rewardEarly: true })
  const photoUrl = computed(() => session.me?.photo_url ?? null)

  // The photo is uploaded as soon as it is picked; the server crops and re-encodes it.
  const photo = useMutation({
    mutation: async (file: File) => session.set(await uploadPhoto(file)),
    meta: { toast: false },
  })

  const answers = useMutation({
    mutation: async (answers: Schemas['OnboardingUpdate']) => {
      session.set(await saveAnswers(answers))
      await router.push({ name: 'onboarding-review' })
    },
    meta: { toast: false },
  })

  const uploading = photo.isLoading
  const photoError = computed(() => (photo.error.value ? photoErrorMessage(photo.error.value) : ''))
  const canSubmit = computed(
    () => !!form.name.trim() && !answers.isLoading.value && !uploading.value,
  )

  async function submit() {
    const { valid, data } = await r$.$validate()
    if (valid) answers.mutate(data)
  }

  return {
    form,
    nameError: computed(() => r$.name.$errors[0] ?? ''),
    photoUrl,
    uploading,
    photoError,
    upload: photo.mutate,
    canSubmit,
    failed: computed(() => !!answers.error.value),
    submit,
  }
}
