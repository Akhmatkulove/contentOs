import { PiniaColada, useQuery, useQueryCache } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent } from 'vue'
import type { Me } from './me'
import { useSessionStore } from './session.store'

const anna = { id: 'a', role: 'brand', status: 'approved', onboarding_step: null } as Me

function setup() {
  const pinia = createPinia()
  mount(
    defineComponent({
      setup: () => useQuery({ key: ['shoots'], query: async () => ['secret'] }),
      template: '<div />',
    }),
    { global: { plugins: [pinia, PiniaColada] } },
  )
  return { session: useSessionStore(pinia), cache: useQueryCache(pinia) }
}

describe('session store', () => {
  it('drops cached data when the user logs out', async () => {
    const { session, cache } = setup()
    session.set(anna)
    await flushPromises()

    session.clear()

    expect(cache.getQueryData(['shoots'])).toBeUndefined()
  })

  it('drops cached data when another user signs in', async () => {
    const { session, cache } = setup()
    session.set(anna)
    await flushPromises()

    session.set({ ...anna, id: 'b' })

    expect(cache.getQueryData(['shoots'])).toBeUndefined()
  })

  it('drops cached data when the role or status changes', async () => {
    const { session, cache } = setup()
    session.set(anna)
    await flushPromises()

    session.set({ ...anna, status: 'rejected' })

    expect(cache.getQueryData(['shoots'])).toBeUndefined()
  })

  it('keeps cached data while the same user moves on', async () => {
    const { session, cache } = setup()
    session.set(anna)
    await flushPromises()

    session.set({ ...anna, name: 'Anna K.' })

    expect(cache.getQueryData(['shoots'])).toEqual(['secret'])
  })
})
