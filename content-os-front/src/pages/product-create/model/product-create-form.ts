import { useMutation, useQueryCache } from '@pinia/colada'
import { useRegleSchema } from '@regle/schemas'
import * as v from 'valibot'
import { computed, onScopeDispose, reactive, shallowRef, toRef } from 'vue'
import { useRouter } from 'vue-router'
import type { Reference } from '@/entities/reference'
import { useSessionStore } from '@/entities/session'
import { openAddReference, toRequest, type ReferenceDraft } from '@/features/add-reference'
import { uploadAll, type PickedFile } from '@/shared/lib'
import { uploadFile, type Schemas } from '@/shared/api'
import type { SelectOption } from '@/shared/ui/select'
import { toast } from '@/shared/ui/toast'
import { createProduct, type ProductCreate } from '../api/products'
import { toRequest as deliverableRequest } from './deliverable-draft'
import { useDeliverables } from './deliverables'
import { useProductPhotos } from './product-photos'
import { draftCard, previewFile } from './reference-draft'

type ProductStatus = Schemas['ProductStatus']

export const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
] as const satisfies readonly (SelectOption & { value: ProductStatus })[]

export const productSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.nonEmpty('Enter the product name.')),
  about: v.pipe(v.string(), v.trim(), v.nonEmpty('Describe the product.')),
  photos: v.pipe(
    v.array(v.custom<PickedFile>(() => true)),
    v.minLength(1, 'Add at least one photo.'),
  ),
})

interface DraftEntry {
  draft: ReferenceDraft
  // Object URL of the draft's first image, owned by this page.
  previewUrl: string | null
}

// Splits a flat list back into chunks of the given sizes: [a,b,c], [1,2] → [[a],[b,c]].
export function splitBySizes<T>(items: T[], sizes: number[]): T[][] {
  let start = 0
  return sizes.map((size) => items.slice(start, (start += size)))
}

// Everything is saved by Create product at once: photos and reference files
// are uploaded first, then the product goes with their ids and the
// deliverables (docs/adr/0003, 0004).
export function useProductCreateForm() {
  const router = useRouter()
  const queryCache = useQueryCache()
  const session = useSessionStore()
  // References made here are the brand's: its name is their Creator.
  const brandName = computed(() => session.me?.name ?? '')

  const form = reactive({
    name: '',
    tags: [] as string[],
    collection: '',
    category: '',
    sku: '',
    status: 'active' as ProductStatus | undefined,
    about: '',
    notes: '',
  })
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

  const drafts = shallowRef<DraftEntry[]>([])
  const references = computed<Reference[]>(() =>
    drafts.value.map(({ draft, previewUrl }) => draftCard(draft, brandName.value, previewUrl)),
  )

  async function addReference() {
    const draft = await openAddReference({
      creator: brandName.value,
      fixed: { product: form.name.trim() || 'New product', collection: form.collection.trim() },
    })
    if (!draft) return
    const preview = previewFile(draft)
    drafts.value = [
      ...drafts.value,
      { draft, previewUrl: preview ? URL.createObjectURL(preview) : null },
    ]
  }

  function removeReference(id: string) {
    const entry = drafts.value.find(({ draft }) => draft.id === id)
    if (!entry) return
    if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl)
    drafts.value = drafts.value.filter((item) => item !== entry)
  }

  const deliverables = useDeliverables(() => form.name.trim())

  onScopeDispose(() => {
    drafts.value.forEach(({ previewUrl }) => previewUrl && URL.revokeObjectURL(previewUrl))
  })

  function cancel() {
    return router.push({ name: 'products' })
  }

  const { mutate, isLoading: creating } = useMutation({
    mutation: async (data: v.InferOutput<typeof productSchema>) => {
      const referenceFiles = drafts.value.map(({ draft }) => draft.files)
      // One queue for every file: at most three uploads at a time overall.
      const uploaded = await uploadAll(
        [...data.photos.map((photo) => photo.file), ...referenceFiles.flat()],
        uploadFile,
      )
      const ids = uploaded.map((file) => file.id)
      const [photoIds = [], ...referenceIds] = splitBySizes(ids, [
        data.photos.length,
        ...referenceFiles.map((files) => files.length),
      ])

      const body: ProductCreate = {
        name: data.name,
        about: data.about,
        notes: form.notes,
        collection: form.collection,
        category: form.category,
        sku: form.sku,
        status: form.status ?? 'active',
        tags: form.tags,
        photo_ids: photoIds,
        references: drafts.value.map(({ draft }, index) =>
          toRequest(draft, referenceIds[index] ?? []),
        ),
        deliverables: deliverables.deliverables.value.map(deliverableRequest),
      }
      return createProduct(body)
    },
    onSuccess: async () => {
      // The list must show the new product, not a cached page without it.
      await queryCache.invalidateQueries({ key: ['products'] })
      toast.success('Product created')
      // TODO(api): open the product once it has a page.
      await router.push({ name: 'products' })
    },
  })

  async function submit() {
    if (creating.value) return
    const { valid, data } = await r$.$validate()
    if (!valid) return
    mutate(data)
  }

  return {
    form,
    errors,
    ...photos,
    references,
    addReference,
    removeReference,
    ...deliverables,
    cancel,
    submit,
    creating,
  }
}
