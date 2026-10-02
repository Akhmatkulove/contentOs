import { onScopeDispose, shallowRef } from 'vue'
import { toast } from '@/shared/ui/toast'

export interface ProductPhoto {
  id: string
  file: File
  // Object URL for the preview; revoked on remove and when the page closes.
  url: string
}

export const photoAccept = 'image/*'

// Same file picked twice (name, size and modified time match) is skipped.
export function photoKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

export function newPhotos(existing: File[], picked: File[]): File[] {
  const seen = new Set(existing.map(photoKey))
  return picked.filter((file) => {
    const key = photoKey(file)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function rejectedPhotosMessage(count: number): string {
  return count === 1 ? 'This file is not an image.' : `${count} files are not images.`
}

// Photos picked for the new product. Kept in memory until the product is created.
export function useProductPhotos() {
  const photos = shallowRef<ProductPhoto[]>([])

  function addPhotos(files: File[]) {
    const fresh = newPhotos(
      photos.value.map((photo) => photo.file),
      files,
    )
    photos.value = [
      ...photos.value,
      ...fresh.map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) })),
    ]
  }

  function removePhoto(id: string) {
    const photo = photos.value.find((item) => item.id === id)
    if (!photo) return
    URL.revokeObjectURL(photo.url)
    photos.value = photos.value.filter((item) => item !== photo)
  }

  function rejectPhotos(files: File[]) {
    toast.error(rejectedPhotosMessage(files.length))
  }

  onScopeDispose(() => {
    photos.value.forEach((photo) => URL.revokeObjectURL(photo.url))
  })

  return { photos, addPhotos, removePhoto, rejectPhotos }
}
