import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { http } from '@/shared/api'
import ProductActionsMenu from './ProductActionsMenu.vue'

async function openMenu(
  canEdit: boolean,
  status: 'active' | 'archived' = 'active',
  inWork = false,
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/products/:id', name: 'product', component: { template: '<div />' } },
      { path: '/products/:id/edit', name: 'product-edit', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  const wrapper = mount(ProductActionsMenu, {
    props: { product: { id: 'p1', status, inWork }, canEdit },
    slots: { trigger: '<button type="button" aria-label="Product actions">…</button>' },
    global: { plugins: [router, createPinia(), PiniaColada] },
    attachTo: document.body,
  })
  await wrapper.get('[aria-label="Product actions"]').trigger('keydown', { key: 'Enter' })
  await flushPromises()
  const items = () => [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')]
  return { wrapper, router, items }
}

const pick = async (items: HTMLElement[], label: string) => {
  items.find((item) => item.textContent?.trim() === label)!.click()
  await flushPromises()
}

describe('ProductActionsMenu', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('offers the owner Edit, Copy link and Archive', async () => {
    const { items, wrapper } = await openMenu(true)
    expect(items().map((item) => item.textContent?.trim())).toEqual([
      'Edit product',
      'Copy link',
      'Archive product',
    ])
    wrapper.unmount()
  })

  it('offers everyone else only Copy link', async () => {
    const { items, wrapper } = await openMenu(false)
    expect(items().map((item) => item.textContent?.trim())).toEqual(['Copy link'])
    wrapper.unmount()
  })

  it('copies the absolute link of the product', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const { items, wrapper } = await openMenu(false)

    await pick(items(), 'Copy link')

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/products/p1`)
    wrapper.unmount()
  })

  it('archives an active product and restores an archived one', async () => {
    const patch = vi.spyOn(http, 'patch').mockResolvedValue({ data: { id: 'p1', status: 'x' } })

    const active = await openMenu(true, 'active')
    await pick(active.items(), 'Archive product')
    expect(patch).toHaveBeenLastCalledWith('/products/p1', { status: 'archived' })
    active.wrapper.unmount()
    document.body.innerHTML = ''

    const archived = await openMenu(true, 'archived')
    await pick(archived.items(), 'Restore product')
    expect(patch).toHaveBeenLastCalledWith('/products/p1', { status: 'active' })
    archived.wrapper.unmount()
  })

  it('keeps a product shoots work on out of the archive, and says why', async () => {
    const patch = vi.spyOn(http, 'patch')
    const { items, wrapper } = await openMenu(true, 'active', true)
    const archive = items().find((item) => item.textContent?.includes('Archive product'))!
    expect(archive.textContent).toContain('Shoots are still working on it')
    expect(archive.hasAttribute('data-disabled')).toBe(true)
    archive.click()
    await flushPromises()
    expect(patch).not.toHaveBeenCalled()
    wrapper.unmount()
    document.body.innerHTML = ''

    // Restoring is always allowed.
    const archived = await openMenu(true, 'archived', true)
    expect(archived.items().map((item) => item.textContent?.trim())).toContain('Restore product')
    archived.wrapper.unmount()
  })

  it('opens the edit form', async () => {
    const { items, router, wrapper } = await openMenu(true)
    await pick(items(), 'Edit product')
    expect(router.currentRoute.value.fullPath).toBe('/products/p1/edit')
    wrapper.unmount()
  })
})
