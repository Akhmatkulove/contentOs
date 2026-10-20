import { computed, shallowRef } from 'vue'
import type { Schemas } from '@/shared/api'
import { IMAGE_ACCEPT, tooLarge, tooLargeMessage, usePickedFiles } from '@/shared/lib'
import { toast } from '@/shared/ui/toast'

export const photoAccept = IMAGE_ACCEPT

export function rejectedPhotosMessage(count: number): string {
  return count === 1
    ? 'This file is not a JPEG, PNG or WebP image.'
    : `${count} files are not JPEG, PNG or WebP images.`
}

// "Photo added", "3 photos added": saved with the product on Save.
function photosAddedMessage(count: number): string {
  return count === 1 ? 'Photo added' : `${count} photos added`
}

// A photo in the form: saved with the product (`file` is null, the id is the
// file id), or picked here and uploaded on save.
export interface PhotoEntry {
  id: string
  url: string
  name: string
  file: File | null
}

// The product's photos: the saved ones first, then the newly picked, in that order.
export function useProductPhotos() {
  const saved = shallowRef<Schemas['FileResponse'][]>([])
  const { files: picked, add, remove } = usePickedFiles()

  const photos = computed<PhotoEntry[]>(() => [
    ...saved.value.map((file, index) => ({
      id: file.id,
      url: file.url,
      name: `Photo ${index + 1}`,
      file: null,
    })),
    ...picked.value.map((item) => ({
      id: item.id,
      url: item.url,
      name: item.file.name,
      file: item.file,
    })),
  ])

  function addPhotos(files: File[]) {
    const large = files.filter(tooLarge)
    if (large.length) toast.error(tooLargeMessage(large.length))
    const fitting = files.filter((file) => !tooLarge(file))
    add(fitting)
    if (fitting.length) toast.success(photosAddedMessage(fitting.length))
  }

  function removePhoto(id: string) {
    if (saved.value.some((file) => file.id === id)) {
      saved.value = saved.value.filter((file) => file.id !== id)
    } else {
      remove(id)
    }
    toast.success('Photo removed')
  }

  function rejectPhotos(files: File[]) {
    toast.error(rejectedPhotosMessage(files.length))
  }

  // The edit form starts from the product's photos.
  function setSavedPhotos(files: Schemas['FileResponse'][]) {
    saved.value = files
  }

  return { photos, setSavedPhotos, addPhotos, removePhoto, rejectPhotos }
}

// Photo ids in the form's order once the new ones are uploaded: saved photos
// keep their file id, each new one takes the next uploaded id.
export function photoIds(photos: PhotoEntry[], uploadedIds: string[]): string[] {
  let next = 0
  return photos.map((photo) => (photo.file ? (uploadedIds[next++] ?? '') : photo.id))
}
