import { useMutation, useQueryCache } from '@pinia/colada'
import { useRouter } from 'vue-router'
import { patchProduct, productKey, type ProductStatus } from '@/entities/product'
import { toast } from '@/shared/ui/toast'

// What the "…" menu needs to know about the product.
export interface ProductActionsTarget {
  id: string
  status: ProductStatus
}

// "Archive product" while active, "Restore product" once archived.
export function archiveLabel(status: ProductStatus): string {
  return status === 'archived' ? 'Restore product' : 'Archive product'
}

// The "…" menu of a product (Figma "Dropdown / productActions"): Edit, Copy link,
// Archive. Edit and Archive are the owner's; Copy link is for everyone who sees it.
export function useProductActions() {
  const router = useRouter()
  const queryCache = useQueryCache()

  function edit(product: ProductActionsTarget) {
    return router.push({ name: 'product-edit', params: { id: product.id } })
  }

  async function copyLink(product: ProductActionsTarget) {
    const { href } = router.resolve({ name: 'product', params: { id: product.id } })
    try {
      await navigator.clipboard.writeText(new URL(href, window.location.origin).href)
      toast.success('Link copied')
    } catch {
      // No permission or no secure context (plain http on a LAN address).
      toast.error('Couldn’t copy the link')
    }
  }

  const { mutate: setStatus, isLoading: archiving } = useMutation({
    mutation: ({ id, status }: ProductActionsTarget) => patchProduct(id, { status }),
    onSuccess: async (saved) => {
      queryCache.setQueryData(productKey(saved.id), saved)
      // Cards show the status; filters by status will too.
      await queryCache.invalidateQueries({ key: ['products'] })
      toast.success(saved.status === 'archived' ? 'Product archived' : 'Product restored')
    },
  })

  function toggleArchive(product: ProductActionsTarget) {
    setStatus({ id: product.id, status: product.status === 'archived' ? 'active' : 'archived' })
  }

  return { edit, copyLink, toggleArchive, archiving }
}
