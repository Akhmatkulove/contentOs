import { usePickedFiles } from '@/shared/lib'
import { toast } from '@/shared/ui/toast'
import { IMAGE_ACCEPT, tooLarge, tooLargeMessage } from './uploads'

export const photoAccept = IMAGE_ACCEPT

export function rejectedPhotosMessage(count: number): string {
  return count === 1
    ? 'This file is not a JPEG, PNG or WebP image.'
    : `${count} files are not JPEG, PNG or WebP images.`
}

// Photos picked for the new product. Kept in memory until the product is created.
export function useProductPhotos() {
  const { files: photos, add, remove: removePhoto } = usePickedFiles()

  function addPhotos(picked: File[]) {
    const large = picked.filter(tooLarge)
    if (large.length) toast.error(tooLargeMessage(large.length))
    add(picked.filter((file) => !tooLarge(file)))
  }

  function rejectPhotos(files: File[]) {
    toast.error(rejectedPhotosMessage(files.length))
  }

  return { photos, addPhotos, removePhoto, rejectPhotos }
}
