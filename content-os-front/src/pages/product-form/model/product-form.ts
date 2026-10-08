import { useMutation, useQueryCache } from '@pinia/colada'
import { useRegleSchema } from '@regle/schemas'
import * as v from 'valibot'
import { computed, nextTick, onScopeDispose, reactive, shallowRef, toRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toDeliverable } from '@/entities/deliverable'
import { productKey, useProduct, type ProductDetails, type ProductStatus } from '@/entities/product'
import { toReference, type Reference } from '@/entities/reference'
import { useSessionStore } from '@/entities/session'
import {
  draftCard,
  openAddReference,
  previewFile,
  toRequest,
  type ReferenceDraft,
} from '@/features/add-reference'
import { uploadFile, type Schemas } from '@/shared/api'
import { uploadAll } from '@/shared/lib'
import { toast } from '@/shared/ui/toast'
import { createProduct, updateProduct, type ProductCreate } from '../api/products'
import { toRequest as deliverableRequest } from './deliverable-draft'
import { useDeliverables } from './deliverables'
import { photoIds, useProductPhotos, type PhotoEntry } from './product-photos'

export const productSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.nonEmpty('Enter the product name.')),
  about: v.pipe(v.string(), v.trim(), v.nonEmpty('Describe the product.')),
  photos: v.pipe(
    v.array(v.custom<PhotoEntry>(() => true)),
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

// The brand's own references of the product: the only ones the form may remove.
// References art directors added stay as they are (docs/adr/0005).
export function ownReferences(product: ProductDetails, brandId: string | undefined) {
  return product.references.filter((reference) => reference.author_id === brandId)
}

// Add product and Edit product: one form. Everything is saved at once: new
// photos and reference files are uploaded first, then the product goes with
// their ids (docs/adr/0003, 0004, 0005). Without `productId` it creates.
export function useProductForm(productId?: string) {
  const router = useRouter()
  const route = useRoute()
  const queryCache = useQueryCache()
  const session = useSessionStore()
  // References made here are the brand's: its name is their Creator.
  const brandName = computed(() => session.me?.name ?? '')
  const editing = productId !== undefined

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
  const { photos, setSavedPhotos, addPhotos, removePhoto, rejectPhotos } = useProductPhotos()

  // rewardEarly: a field turns valid as soon as it is fixed, but turns invalid only on submit.
  const { r$ } = useRegleSchema(
    reactive({ name: toRef(form, 'name'), about: toRef(form, 'about'), photos }),
    productSchema,
    { rewardEarly: true },
  )
  const errors = computed(() => ({
    name: r$.name.$errors[0] ?? '',
    about: r$.about.$errors[0] ?? '',
    photos: r$.photos.$errors.$self[0] ?? '',
  }))

  const savedReferences = shallowRef<Schemas['ReferenceResponse'][]>([])
  const drafts = shallowRef<DraftEntry[]>([])
  const references = computed<Reference[]>(() => [
    ...drafts.value.map(({ draft, previewUrl }) => draftCard(draft, brandName.value, previewUrl)),
    ...savedReferences.value.map(toReference),
  ])

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
    toast.success('Reference added')
  }

  function removeReference(id: string) {
    savedReferences.value = savedReferences.value.filter((reference) => reference.id !== id)
    toast.success('Reference removed')
    const entry = drafts.value.find(({ draft }) => draft.id === id)
    if (!entry) return
    if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl)
    drafts.value = drafts.value.filter((item) => item !== entry)
  }

  const { deliverables, savedDeliverables, deliverableDrafts, addDeliverable, removeDeliverable } =
    useDeliverables(() => form.name.trim())

  onScopeDispose(() => {
    drafts.value.forEach(({ previewUrl }) => previewUrl && URL.revokeObjectURL(previewUrl))
  })

  // Editing: the form starts from the saved product, once it has loaded.
  const product = editing ? useProduct(productId) : null
  const loaded = shallowRef(!editing)

  function fill(saved: ProductDetails) {
    Object.assign(form, {
      name: saved.name,
      tags: saved.tags,
      collection: saved.collection ?? '',
      category: saved.category ?? '',
      sku: saved.sku ?? '',
      status: saved.status,
      about: saved.about,
      notes: saved.notes ?? '',
    })
    setSavedPhotos(saved.photos)
    savedReferences.value = ownReferences(saved, session.me?.id)
    savedDeliverables.value = saved.deliverables.map(toDeliverable)
    loaded.value = true
  }

  if (product) {
    watch(
      product.data,
      async (saved) => {
        if (!saved || loaded.value) return
        // Only the brand that owns the product edits it; the rest get its page.
        if (!saved.can_edit) {
          await router.replace({ name: 'product', params: { id: saved.id } })
          return
        }
        fill(saved)
        // "+" on the product page opens the form at its section (#photos, …).
        await nextTick()
        document.getElementById(route.hash.slice(1))?.scrollIntoView({ block: 'start' })
      },
      { immediate: true },
    )
  }
  // The product couldn't be loaded: not found, not the brand's, or no connection.
  const loadError = computed(() => product?.error.value ?? null)

  function cancel() {
    return router.push(
      productId === undefined
        ? { name: 'products' }
        : { name: 'product', params: { id: productId } },
    )
  }

  const { mutate, isLoading: saving } = useMutation({
    mutation: async (data: v.InferOutput<typeof productSchema>) => {
      const referenceFiles = drafts.value.map(({ draft }) => draft.files)
      const newPhotos = data.photos.flatMap((photo) => (photo.file ? [photo.file] : []))
      // One queue for every file: at most three uploads at a time overall.
      const uploaded = await uploadAll([...newPhotos, ...referenceFiles.flat()], uploadFile)
      const [photoUploads = [], ...referenceIds] = splitBySizes(
        uploaded.map((file) => file.id),
        [newPhotos.length, ...referenceFiles.map((files) => files.length)],
      )

      const body: ProductCreate = {
        name: data.name,
        about: data.about,
        notes: form.notes,
        collection: form.collection,
        category: form.category,
        sku: form.sku,
        status: form.status ?? 'active',
        tags: form.tags,
        photo_ids: photoIds(data.photos, photoUploads),
        references: drafts.value.map(({ draft }, index) =>
          toRequest(draft, referenceIds[index] ?? []),
        ),
        deliverables: deliverableDrafts.value.map(deliverableRequest),
      }
      return productId !== undefined
        ? updateProduct(productId, {
            ...body,
            reference_ids: savedReferences.value.map((reference) => reference.id),
            deliverable_ids: savedDeliverables.value.map((deliverable) => deliverable.id),
          })
        : createProduct(body)
    },
    onSuccess: async (saved) => {
      // The product page opens with what the server saved, without a refetch.
      queryCache.setQueryData(productKey(saved.id), saved)
      // Lists, filter options and the pool may all show the product or its references.
      await Promise.all([
        queryCache.invalidateQueries({ key: ['products'] }),
        queryCache.invalidateQueries({ key: ['references'] }),
      ])
      toast.success(editing ? 'Changes saved' : 'Product created')
      await router.push({ name: 'product', params: { id: saved.id } })
    },
  })

  async function submit() {
    if (saving.value || !loaded.value) return
    const { valid, data } = await r$.$validate()
    if (!valid) return
    mutate(data)
  }

  return {
    editing,
    loaded,
    loadError,
    form,
    errors,
    photos,
    addPhotos,
    removePhoto,
    rejectPhotos,
    references,
    addReference,
    removeReference,
    deliverables,
    addDeliverable,
    removeDeliverable,
    cancel,
    submit,
    saving,
  }
}
