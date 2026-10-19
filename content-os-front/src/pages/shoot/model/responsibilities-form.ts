import { useRegleSchema } from '@regle/schemas'
import * as v from 'valibot'
import { computed, reactive } from 'vue'
import type { ResponsibilitiesBody } from '../api/responsibilities'

// As the server takes it (ShootResponsibilitiesUpdate): up to 2000 characters;
// empty clears the list.
export const responsibilitiesSchema = v.object({
  responsibilities: v.pipe(
    v.string(),
    v.trim(),
    v.maxLength(2000, 'Keep the responsibilities under 2000 characters.'),
  ),
}) satisfies v.GenericSchema<ResponsibilitiesBody>

// The Add / Edit responsibilities form; `text`: what is saved now.
export function useResponsibilitiesForm(text: string) {
  const form = reactive({ responsibilities: text })

  const { r$ } = useRegleSchema(form, responsibilitiesSchema, { rewardEarly: true })
  const errors = computed(() => ({ responsibilities: r$.responsibilities.$errors[0] ?? '' }))

  // The request, or null while the form is invalid.
  async function submit(): Promise<ResponsibilitiesBody | null> {
    const { valid, data } = await r$.$validate()
    return valid ? data : null
  }

  return { form, errors, submit }
}
