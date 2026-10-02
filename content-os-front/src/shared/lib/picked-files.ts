import { onScopeDispose, shallowRef } from 'vue'

export interface PickedFile {
  id: string
  file: File
  // Object URL for the preview; revoked on remove and when the scope ends.
  url: string
}

// Same file picked twice (name, size and modified time match) is skipped.
export function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

export function newFiles(existing: File[], picked: File[]): File[] {
  const seen = new Set(existing.map(fileKey))
  return picked.filter((file) => {
    const key = fileKey(file)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// Files picked in a form, with previews, kept in memory until it is sent.
export function usePickedFiles() {
  const files = shallowRef<PickedFile[]>([])

  function add(picked: File[]) {
    const fresh = newFiles(
      files.value.map((item) => item.file),
      picked,
    )
    files.value = [
      ...files.value,
      ...fresh.map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) })),
    ]
  }

  function remove(id: string) {
    const item = files.value.find((entry) => entry.id === id)
    if (!item) return
    URL.revokeObjectURL(item.url)
    files.value = files.value.filter((entry) => entry !== item)
  }

  onScopeDispose(() => {
    files.value.forEach((item) => URL.revokeObjectURL(item.url))
  })

  return { files, add, remove }
}
