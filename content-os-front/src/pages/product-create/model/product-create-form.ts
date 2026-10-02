import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import type { SelectOption } from '@/shared/ui/select'

// TODO(api): load tags, collections and categories from the backend; the
// values below come from the Figma mockups.
export const tagOptions: SelectOption[] = []

export const collectionOptions: SelectOption[] = [
  { value: 'autumn-26', label: 'Autumn 26' },
  { value: 'everyday', label: 'Everyday' },
  { value: 'resort-25', label: 'Resort 25' },
  { value: 'summer-25', label: 'Summer 25' },
]

export const categoryOptions: SelectOption[] = [
  { value: 'abayas', label: 'Abayas' },
  { value: 'dresses', label: 'Dresses' },
  { value: 'sets', label: 'Sets' },
]

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
    // TODO(ui): tags need a multi-select; VSelect picks one value for now.
    tag: undefined as string | undefined,
    collection: undefined as string | undefined,
    category: undefined as string | undefined,
    sku: '',
    status: 'active' as string | undefined,
    about: '',
    notes: '',
  })

  function cancel() {
    return router.push({ name: 'products' })
  }

  // TODO(api): create the product with useMutation, then open it.
  function submit() {}

  return { form, cancel, submit }
}
