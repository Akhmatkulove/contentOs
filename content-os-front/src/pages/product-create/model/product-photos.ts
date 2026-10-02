import { usePickedFiles } from '@/shared/lib'
import { toast } from '@/shared/ui/toast'

export const photoAccept = 'image/*'

export function rejectedPhotosMessage(count: number): string {
  return count === 1 ? 'This file is not an image.' : `${count} files are not images.`
}

// Photos picked for the new product. Kept in memory until the product is created.
export function useProductPhotos() {
  const { files: photos, add: addPhotos, remove: removePhoto } = usePickedFiles()

  function rejectPhotos(files: File[]) {
    toast.error(rejectedPhotosMessage(files.length))
  }

  return { photos, addPhotos, removePhoto, rejectPhotos }
}
