import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { queryParam, readQuery, useQueryParams, writeQuery } from './query-params'

const defs = {
  search: queryParam.text(),
  status: queryParam.oneOf(['all', 'active', 'archived'], 'all'),
  productId: queryParam.text('all', 'product'),
  page: queryParam.page(),
}

describe('readQuery', () => {
  it('reads valid values and falls back to defaults for the rest', () => {
    expect(
      readQuery({ search: 'linen', status: 'archived', product: 'p1', page: '3' }, defs),
    ).toEqual({ search: 'linen', status: 'archived', productId: 'p1', page: 3 })
    expect(readQuery({ status: 'deleted', page: '-2', search: ['a', 'b'] }, defs)).toEqual({
      search: '',
      status: 'all',
      productId: 'all',
      page: 1,
    })
    expect(readQuery({ page: '1.5' }, defs).page).toBe(1)
  })
})

describe('writeQuery', () => {
  it('leaves defaults out and keeps parameters it does not know', () => {
    expect(writeQuery({ tab: 'x', status: 'archived' }, defs, { status: 'all', page: 2 })).toEqual({
      tab: 'x',
      page: '2',
    })
    expect(writeQuery({}, defs, { productId: 'p1', search: '' })).toEqual({ product: 'p1' })
  })
})

describe('useQueryParams', () => {
  async function setup(path = '/list') {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/list', component: { render: () => null } }],
    })
    await router.push(path)
    let params!: ReturnType<typeof useQueryParams<typeof defs>>
    mount(
      defineComponent({
        setup() {
          params = useQueryParams(defs, { page: 'page' })
          return () => null
        },
      }),
      { global: { plugins: [router] } },
    )
    return { router, state: params.state, update: params.update, reset: params.reset }
  }

  it('reads the state from the URL', async () => {
    const { state } = await setup('/list?status=active&page=2')
    expect({ ...state }).toEqual({ search: '', status: 'active', productId: 'all', page: 2 })
  })

  it('writes several fields as one replace, back to the first page', async () => {
    const { router, state } = await setup('/list?page=3')
    const replace = vi.spyOn(router, 'replace')
    const push = vi.spyOn(router, 'push')

    state.status = 'archived'
    state.search = 'linen'
    // The new values are there before the URL catches up.
    expect(state.status).toBe('archived')
    expect(state.page).toBe(1)
    await flushPromises()

    expect(replace).toHaveBeenCalledOnce()
    expect(push).not.toHaveBeenCalled()
    expect(router.currentRoute.value.query).toEqual({ status: 'archived', search: 'linen' })
  })

  it('keeps the page when only the page changes, and ignores no-op writes', async () => {
    const { router, state } = await setup('/list?status=active')
    const replace = vi.spyOn(router, 'replace')
    state.page = 4
    state.status = 'active'
    await flushPromises()
    expect(replace).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.query).toEqual({ status: 'active', page: '4' })
  })

  it('follows Back and links', async () => {
    const { router, state } = await setup()
    await router.push('/list?status=archived&page=2')
    expect(state.status).toBe('archived')
    expect(state.page).toBe(2)
  })

  it('resets the given fields to their defaults and leaves the rest', async () => {
    const { router, state, reset } = await setup(
      '/list?status=archived&search=linen&product=p1&page=3',
    )
    reset(['status', 'search'])
    await flushPromises()
    expect(state.status).toBe('all')
    expect(router.currentRoute.value.query).toEqual({ product: 'p1' })
  })
})
