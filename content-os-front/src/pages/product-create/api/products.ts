import { http, type Schemas } from '@/shared/api'

export type UploadedFile = Schemas['FileResponse']
export type ProductCreate = Schemas['ProductCreate']
export type CreatedProduct = Schemas['ProductResponse']

// One file per request; its id then goes into the product (docs/adr/0003).
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

export async function createProduct(body: ProductCreate): Promise<CreatedProduct> {
  return (await http.post<CreatedProduct>('/products', body)).data
}
