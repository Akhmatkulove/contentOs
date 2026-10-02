import { reactive } from 'vue'
import { useRouter } from 'vue-router'

// Layout only for now: the fields keep what the user types, nothing is sent.
export function useProductCreateForm() {
  const router = useRouter()

  // TODO(api): products endpoint. Replace with the request type from
  // `Schemas` and add the select fields (tags, collection, category, status)
  // once VSelect exists.
  const form = reactive({
    name: '',
    sku: '',
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
