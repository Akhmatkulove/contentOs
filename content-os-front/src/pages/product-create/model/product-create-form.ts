import { useRegleSchema } from '@regle/schemas'
import * as v from 'valibot'
import { computed, reactive, toRef } from 'vue'
import { useRouter } from 'vue-router'
import type { PickedFile } from '@/shared/lib'
import type { SelectOption } from '@/shared/ui/select'
import { openAddReference } from './add-reference'
import { useProductPhotos } from './product-photos'

export const statusOptions: SelectOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
]

// TODO(api): check against the request type from `Schemas` once the products endpoint exists.
export const productSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.nonEmpty('Enter the product name.')),
  about: v.pipe(v.string(), v.trim(), v.nonEmpty('Describe the product.')),
  photos: v.pipe(
    v.array(v.custom<PickedFile>(() => true)),
    v.minLength(1, 'Add at least one photo.'),
  ),
})

// Layout only for now: the fields keep what the user enters, nothing is sent.
export function useProductCreateForm() {
  const router = useRouter()

  // TODO(api): products endpoint. Replace with the request type from `Schemas`.
  const form = reactive({
    name: '',
    tags: [] as string[],
    collection: '',
    category: '',
    sku: '',
    status: 'active' as string | undefined,
    about: '',
    notes: '',
  })
  // TODO(api): no upload endpoint for product photos yet; send them with the create request.
  const photos = useProductPhotos()

  // rewardEarly: a field turns valid as soon as it is fixed, but turns invalid only on submit.
  const { r$ } = useRegleSchema(
    reactive({ name: toRef(form, 'name'), about: toRef(form, 'about'), photos: photos.photos }),
    productSchema,
    { rewardEarly: true },
  )
  const errors = computed(() => ({
    name: r$.name.$errors[0] ?? '',
    about: r$.about.$errors[0] ?? '',
    photos: r$.photos.$errors.$self[0] ?? '',
  }))

  function cancel() {
    return router.push({ name: 'products' })
  }

  // TODO(api): attach the created reference to the product.
  function addReference() {
    return openAddReference()
  }

  async function submit() {
    const { valid } = await r$.$validate()
    if (!valid) return
    // TODO(api): create the product with useMutation, then open it.
  }

  return { form, errors, ...photos, addReference, cancel, submit }
}
