import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent } from 'vue'
import type { Reference } from '@/entities/reference'
import { setFavorite } from '../api/references'
import { useFavorites } from './favorites'

vi.mock('../api/references', () => ({ setFavorite: vi.fn() }))

const reference = { id: 'r1', favorite: false } as Reference

function setup() {
  let favorites!: ReturnType<typeof useFavorites>
  mount(
    defineComponent({
      setup() {
        favorites = useFavorites()
        return () => null
      },
    }),
    { global: { plugins: [createPinia(), PiniaColada] } },
  )
  return favorites
}

describe('useFavorites', () => {
  afterEach(() => vi.mocked(setFavorite).mockReset())

  it('fills the star at once and saves it', async () => {
    let finish!: () => void
    vi.mocked(setFavorite).mockReturnValue(new Promise((resolve) => (finish = resolve)))
    const { withPending, toggle } = setup()

    toggle(reference)
    expect(withPending(reference).favorite).toBe(true)
    await flushPromises()
    expect(setFavorite).toHaveBeenCalledWith('r1', true)

    finish()
    await flushPromises()
    // Saved: the refetched list carries the state from now on.
    expect(withPending(reference)).toBe(reference)
  })

  it('puts the star back when saving fails', async () => {
    vi.mocked(setFavorite).mockRejectedValue(new Error('offline'))
    const { withPending, toggle } = setup()

    toggle({ ...reference, favorite: true })
    expect(withPending(reference).favorite).toBe(false)
    await flushPromises()
    expect(setFavorite).toHaveBeenCalledWith('r1', false)
    expect(withPending(reference).favorite).toBe(false)
    expect(withPending({ ...reference, favorite: true }).favorite).toBe(true)
  })
})
