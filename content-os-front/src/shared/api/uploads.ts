import { http } from './http'
import type { Schemas } from './contract'

export type UploadedFile = Schemas['FileResponse']

// One file per request; its id then goes into a product or a reference (docs/adr/0003).
export async function uploadFile(file: File): Promise<UploadedFile> {
  const form = new FormData()
  form.append('file', file)
  return (
    await http.post<UploadedFile>('/uploads', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // Videos up to 100 MB over a slow connection.
      timeout: 5 * 60_000,
    })
  ).data
}
