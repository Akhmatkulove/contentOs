import { PiniaColada, useMutation, useQuery } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent } from 'vue'
import { ApiError, type RequestMeta } from '@/shared/api'
import { toast } from '@/shared/ui/toast'
import { queryOptions } from '.'

vi.mock('@/shared/ui/toast', () => ({ toast: { error: vi.fn() } }))

function mountWith(setup: () => unknown) {
  return mount(defineComponent({ setup, template: '<div />' }), {
    global: { plugins: [createPinia(), [PiniaColada, queryOptions]] },
  })
}

function failingMutation(meta?: RequestMeta) {
  let run!: () => void
  mountWith(() => {
    const { mutate } = useMutation({
      mutation: () => Promise.reject(new ApiError(500, 'boom')),
      meta,
    })
    run = () => mutate()
  })
  return run
}

describe('global request error handler', () => {
  beforeEach(() => vi.mocked(toast.error).mockClear())

  it('shows a toast when a mutation fails', async () => {
    failingMutation()()
    await flushPromises()

    expect(toast.error).toHaveBeenCalledWith('Something went wrong. Please try again.')
  })

  it('stays quiet when the mutation handles its own errors', async () => {
    failingMutation({ toast: false })()
    await flushPromises()

    expect(toast.error).not.toHaveBeenCalled()
  })

  it('shows a toast when a query fails', async () => {
    mountWith(() =>
      useQuery({ key: ['failing'], query: () => Promise.reject(new ApiError(0, 'offline')) }),
    )
    await flushPromises()

    expect(toast.error).toHaveBeenCalledWith('No connection. Check your internet and try again.')
  })
})
