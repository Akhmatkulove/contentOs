import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { ApiError, uploadFile, type UploadedFile } from '@/shared/api'
import { editVersion, type TaskDetails } from '../api/task'
import type { ContentVersion } from './task'
import { useVersionEdit } from './version-edit'

vi.mock('../api/task', () => ({ editVersion: vi.fn() }))
vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  uploadFile: vi.fn(),
}))
vi.mock('@/shared/ui/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const version = {
  id: 'v1',
  files: [
    { id: 'f1', name: 'a.jpg', size: '1 KB', url: 'f1', video: false },
    { id: 'f2', name: 'b.jpg', size: '1 KB', url: 'f2', video: false },
  ],
} as ContentVersion

function picked(name: string) {
  return new File(['x'], name, { type: 'image/jpeg' })
}

async function setup(onSaved = vi.fn()) {
  const pinia = createPinia()
  setActivePinia(pinia)
  let edit!: ReturnType<typeof useVersionEdit>
  mount(
    defineComponent({
      setup() {
        edit = useVersionEdit('t1', onSaved)
        return () => null
      },
    }),
    { global: { plugins: [pinia, PiniaColada] } },
  )
  return edit
}

describe('useVersionEdit', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:x', revokeObjectURL: () => {} })
  })
  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('sends the kept files and the uploaded ones, then closes', async () => {
    vi.mocked(uploadFile).mockImplementation(
      async (file) => ({ id: `id-${file.name}` }) as UploadedFile,
    )
    const next = { id: 't1' } as TaskDetails
    vi.mocked(editVersion).mockResolvedValue(next)
    const onSaved = vi.fn()
    const edit = await setup(onSaved)

    edit.start(version)
    edit.removeKept('f2')
    edit.addFiles([picked('c.jpg')])
    expect(edit.canSave.value).toBe(false)
    await flushPromises()
    expect(edit.canSave.value).toBe(true)

    edit.save()
    await flushPromises()
    expect(editVersion).toHaveBeenCalledWith('t1', 'v1', ['f1', 'id-c.jpg'])
    expect(onSaved).toHaveBeenCalledWith(next)
    expect([edit.editing.value, edit.kept.value, edit.added.value]).toEqual([null, [], []])
  })

  it('waits for a failed file to be retried or dropped, and for any file at all', async () => {
    vi.mocked(uploadFile).mockRejectedValueOnce(new ApiError(0, 'offline'))
    const edit = await setup()

    edit.start(version)
    edit.addFiles([picked('c.jpg')])
    await flushPromises()
    expect(edit.added.value[0]!.failed).toBeTruthy()
    expect(edit.canSave.value).toBe(false)

    edit.discard(edit.added.value[0]!.id)
    // Back to the files it had: nothing to send.
    expect(edit.canSave.value).toBe(false)
    edit.removeKept('f2')
    expect(edit.canSave.value).toBe(true)
    edit.removeKept('f1')
    expect(edit.canSave.value).toBe(false)
  })
})
