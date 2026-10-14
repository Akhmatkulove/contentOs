import axios from 'axios'
import { ApiError } from './api-error'
import { http } from './http'
import { uploadFile } from './uploads'

describe('uploadFile', () => {
  const file = new File(['abc'], 'walk.mp4', { type: 'video/mp4' })
  const ticket = {
    id: 'u1',
    url: 'https://storage.test/uploads/u1?signature=x',
    headers: { 'Content-Type': 'video/mp4' },
  }

  afterEach(() => vi.restoreAllMocks())

  it('asks for a ticket, puts the bytes into the storage and has them checked', async () => {
    const post = vi
      .spyOn(http, 'post')
      .mockResolvedValueOnce({ data: ticket })
      .mockResolvedValueOnce({ data: { id: 'u1', kind: 'video' } })
    const put = vi.spyOn(axios, 'put').mockImplementation(async (_url, _body, config) => {
      config?.onUploadProgress?.({ loaded: 1, total: 4 } as never)
      return { data: '' }
    })
    const progress = vi.fn()

    const uploaded = await uploadFile(file, progress)

    expect(post).toHaveBeenNthCalledWith(1, '/uploads', {
      name: 'walk.mp4',
      size: 3,
      content_type: 'video/mp4',
    })
    // Straight to the storage, with the signed Content-Type.
    expect(put).toHaveBeenCalledWith(
      ticket.url,
      file,
      expect.objectContaining({ headers: ticket.headers }),
    )
    expect(progress).toHaveBeenCalledWith(0.25)
    expect(post).toHaveBeenNthCalledWith(2, '/uploads/u1/complete', null, expect.anything())
    expect(uploaded).toEqual({ id: 'u1', kind: 'video' })
  })

  it('fails with an ApiError when the storage refuses the bytes', async () => {
    vi.spyOn(http, 'post').mockResolvedValueOnce({ data: ticket })
    vi.spyOn(axios, 'put').mockRejectedValue(new Error('Network Error'))

    const failure = uploadFile(file)

    await expect(failure).rejects.toBeInstanceOf(ApiError)
    await expect(failure).rejects.toMatchObject({ status: 0 })
  })
})
