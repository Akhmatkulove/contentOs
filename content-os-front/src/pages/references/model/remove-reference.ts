import { useMutation, useQueryCache } from '@pinia/colada'
import { referenceKeys, type Reference } from '@/entities/reference'
import { confirmAction } from '@/shared/ui/confirm-modal'
import { toast } from '@/shared/ui/toast'
import { deleteReference } from '../api/references'

// Delete asks first: the reference leaves the pool and every shoot that uses it.
// `onDeleted` runs before the list refetches (the page steps back from an emptied page).
export function useRemoveReference(onDeleted?: () => void) {
  const queryCache = useQueryCache()

  const { mutate } = useMutation({
    mutation: (reference: Reference) => deleteReference(reference.id),
    onSuccess: async () => {
      toast.success('Reference deleted')
      onDeleted?.()
      // The filters too: the reference may have been the last with its tag or product.
      await queryCache.invalidateQueries({ key: referenceKeys.all })
    },
  })

  async function remove(reference: Reference) {
    const confirmed = await confirmAction({
      title: 'Delete reference?',
      description: `“${reference.title}” will be deleted for everyone and removed from shoots that use it. This can’t be undone.`,
      confirmLabel: 'Delete',
    })
    if (confirmed) mutate(reference)
  }

  return { remove }
}
