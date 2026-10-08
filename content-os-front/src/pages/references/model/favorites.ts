import { useMutation, useQueryCache } from '@pinia/colada'
import { reactive } from 'vue'
import type { Reference } from '@/entities/reference'
import { toast } from '@/shared/ui/toast'
import { setFavorite } from '../api/references'

// Favourites flip at once: the star changes before the request ends and
// goes back if it fails (the global handler shows the error toast).
export function useFavorites() {
  const queryCache = useQueryCache()
  // Stars flipped here and not yet confirmed by a fresh list.
  const pending = reactive(new Map<string, boolean>())

  const { mutate } = useMutation({
    mutation: ({ id, favorite }: { id: string; favorite: boolean }) => setFavorite(id, favorite),
    onError: (_error, { id }) => {
      pending.delete(id)
    },
    // The list refetches with the saved state, then the local flip isn't needed.
    onSuccess: async (_data, { id, favorite }) => {
      toast.success(favorite ? 'Added to favorites' : 'Removed from favorites')
      await queryCache.invalidateQueries({ key: ['references', 'list'] })
      pending.delete(id)
    },
  })

  function withPending(reference: Reference): Reference {
    const favorite = pending.get(reference.id)
    return favorite === undefined ? reference : { ...reference, favorite }
  }

  function toggle(reference: Reference) {
    const favorite = !reference.favorite
    pending.set(reference.id, favorite)
    mutate({ id: reference.id, favorite })
  }

  return { withPending, toggle }
}
