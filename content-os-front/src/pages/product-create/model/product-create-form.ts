import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import type { SelectOption } from '@/shared/ui/select'
import { openAddReference } from './add-reference'
import { useProductPhotos } from './product-photos'

export const statusOptions: SelectOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
]

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

  function cancel() {
    return router.push({ name: 'products' })
  }

  // TODO(api): attach the created reference to the product.
  function addReference() {
    return openAddReference()
  }

  // TODO(api): create the product with useMutation, then open it.
  function submit() {}

  return { form, ...photos, addReference, cancel, submit }
}
