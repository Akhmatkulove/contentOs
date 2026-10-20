// What the backend accepts (app/files/media.py): the type is checked by content
// there, these only spare the user a pointless upload.
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'
export const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/webm'

const MB = 1024 * 1024
export const MAX_IMAGE_BYTES = 15 * MB
const MAX_VIDEO_BYTES = 100 * MB

export function isVideo(file: File): boolean {
  return file.type.startsWith('video/')
}

export function tooLarge(file: File): boolean {
  return file.size > (isVideo(file) ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)
}

export function tooLargeMessage(count: number): string {
  const limits = 'Images up to 15 MB, videos up to 100 MB.'
  return count === 1
    ? `This file is too large. ${limits}`
    : `${count} files are too large. ${limits}`
}

// Uploads with at most `limit` requests at a time; results keep the input order.
export async function uploadAll<I, T>(
  items: I[],
  upload: (item: I) => Promise<T>,
  limit = 3,
): Promise<T[]> {
  const results: T[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const index = next++
      results[index] = await upload(items[index]!)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}
