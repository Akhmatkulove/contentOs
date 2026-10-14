import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { ApiError, uploadFile, type UploadedFile } from '@/shared/api'
import { toast } from '@/shared/ui/toast'
import { addDraftFiles, fetchTask, type TaskDetails } from '../api/task'
import { useTaskPage } from './task-page'

vi.mock('../api/task', () => ({
  fetchTask: vi.fn(),
  addDraftFiles: vi.fn(),
  removeDraftFile: vi.fn(),
  saveDraft: vi.fn(),
  submitDraft: vi.fn(),
}))
vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  uploadFile: vi.fn(),
}))
vi.mock('@/shared/ui/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

function task(draftFileIds: string[] = []): TaskDetails {
  return {
    id: 't1',
    can_upload: true,
    status: 'to_shoot',
    versions: [],
    draft: draftFileIds.length
      ? { id: 'd1', files: draftFileIds.map((id) => ({ id, kind: 'image', size: 1, url: id })) }
      : null,
  } as unknown as TaskDetails
}

function picked(name: string) {
  return new File(['x'], name, { type: 'image/jpeg' })
}

async function setup() {
  const pinia = createPinia()
  setActivePinia(pinia)
  let page!: ReturnType<typeof useTaskPage>
  mount(
    defineComponent({
      setup() {
        page = useTaskPage('t1')
        return () => null
      },
    }),
    { global: { plugins: [pinia, PiniaColada] } },
  )
  await flushPromises()
  return page
}

describe('useTaskPage uploads', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:x', revokeObjectURL: () => {} })
    vi.mocked(fetchTask).mockResolvedValue(task())
  })
  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('adds the files that made it and keeps a failed one for Retry', async () => {
    vi.mocked(uploadFile).mockImplementation(async (file) => {
      if (file.name === 'b.jpg') throw new ApiError(0, 'offline')
      return { id: `id-${file.name}` } as UploadedFile
    })
    vi.mocked(addDraftFiles).mockResolvedValue(task(['id-a.jpg']))
    const page = await setup()

    page.addFiles([picked('a.jpg'), picked('b.jpg')])
    await flushPromises()

    expect(addDraftFiles).toHaveBeenCalledWith('t1', ['id-a.jpg'])
    expect(page.pending.value).toMatchObject([
      { name: 'b.jpg', failed: { message: 'Upload failed', retryable: true } },
    ])
    expect(toast.error).toHaveBeenCalledWith('A file didn’t upload.')
    // Submit waits until the failed file is retried or removed.
    expect(page.canSubmit.value).toBe(false)

    // The server now has both; a refetch after the save brings the same.
    vi.mocked(addDraftFiles).mockResolvedValue(task(['id-a.jpg', 'id-b.jpg']))
    vi.mocked(fetchTask).mockResolvedValue(task(['id-a.jpg', 'id-b.jpg']))
    vi.mocked(uploadFile).mockResolvedValue({ id: 'id-b.jpg' } as UploadedFile)
    page.retry(page.pending.value[0]!.id)
    await flushPromises()

    expect(addDraftFiles).toHaveBeenLastCalledWith('t1', ['id-b.jpg'])
    expect(page.pending.value).toEqual([])
    expect(page.canSubmit.value).toBe(true)
  })

  it('does not offer Retry for a file the server refused', async () => {
    vi.mocked(uploadFile).mockRejectedValue(new ApiError(422, 'Only JPEG, PNG, WebP images'))
    const page = await setup()

    page.addFiles([picked('a.jpg')])
    await flushPromises()

    expect(addDraftFiles).not.toHaveBeenCalled()
    expect(page.pending.value[0]!.failed).toEqual({
      message: 'Only JPEG, PNG, WebP images',
      retryable: false,
    })
    page.discard(page.pending.value[0]!.id)
    expect(page.pending.value).toEqual([])
  })

  it('retries only the draft step when the files were already sent', async () => {
    vi.mocked(uploadFile).mockResolvedValue({ id: 'id-a' } as UploadedFile)
    vi.mocked(addDraftFiles).mockRejectedValueOnce(new ApiError(500, 'boom'))
    const page = await setup()

    page.addFiles([picked('a.jpg')])
    await flushPromises()
    expect(page.pending.value[0]!.failed?.retryable).toBe(true)

    vi.mocked(addDraftFiles).mockResolvedValue(task(['id-a']))
    page.retry(page.pending.value[0]!.id)
    await flushPromises()

    expect(uploadFile).toHaveBeenCalledTimes(1)
    expect(addDraftFiles).toHaveBeenLastCalledWith('t1', ['id-a'])
    expect(page.pending.value).toEqual([])
  })
})
