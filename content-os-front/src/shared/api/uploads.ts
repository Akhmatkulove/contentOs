import axios from 'axios'
import { toApiError } from './api-error'
import type { Schemas } from './contract'
import { http } from './http'

export type UploadedFile = Schemas['FileResponse']
type UploadTicket = Schemas['UploadTicket']

// Videos up to 100 MB over a slow connection.
const PUT_TIMEOUT = 5 * 60_000

// One file goes straight to the storage, past our API (docs/adr/0013):
//   1. the API checks the name, size and type and hands out a presigned PUT URL;
//   2. the browser PUTs the bytes there;
//   3. the API checks what arrived and keeps it.
// Its id then goes into a product, a reference or a task (docs/adr/0003).
// `onProgress` gets the sent share, 0–1, as the bytes go out.
export async function uploadFile(
  file: File,
  onProgress?: (sent: number) => void,
): Promise<UploadedFile> {
  const { data: ticket } = await http.post<UploadTicket>('/uploads', {
    name: file.name,
    size: file.size,
    content_type: file.type,
  })
  try {
    // Plain axios: the storage is another origin and gets neither our base URL nor cookies.
    await axios.put(ticket.url, file, {
      headers: ticket.headers,
      timeout: PUT_TIMEOUT,
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(event.loaded / event.total)
      },
    })
  } catch (error) {
    throw toApiError(error)
  }
  // Images are re-encoded here: give it longer than a plain request.
  return (
    await http.post<UploadedFile>(`/uploads/${ticket.id}/complete`, null, { timeout: 60_000 })
  ).data
}
