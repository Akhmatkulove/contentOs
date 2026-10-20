import { createMemoryHistory, createRouter } from 'vue-router'
import { installChunkReload } from './chunk-reload'

const Page = { template: '<div />' }
let uninstall = () => {}

function setup() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Page },
      { path: '/shoots', component: Page },
    ],
  })
  uninstall = installChunkReload(router)
  return router
}

describe('installChunkReload', () => {
  const reload = vi.fn()
  const assign = vi.fn()

  beforeEach(() => {
    sessionStorage.clear()
    reload.mockReset()
    assign.mockReset()
    vi.stubGlobal('location', {
      href: 'http://localhost/products/1/edit#photos',
      reload,
      assign,
    })
  })

  afterEach(() => {
    uninstall()
    vi.unstubAllGlobals()
  })

  it('reloads the current page, even when its URL has a hash', () => {
    setup()
    window.dispatchEvent(new Event('vite:preloadError'))

    expect(reload).toHaveBeenCalledOnce()
    expect(assign).not.toHaveBeenCalled()
  })

  it('goes to the route being opened when its chunk is missing', async () => {
    const router = setup()
    await router.push('/')
    router.beforeEach(() => {
      window.dispatchEvent(new Event('vite:preloadError'))
    })
    await router.push('/shoots')

    expect(assign).toHaveBeenCalledWith('/shoots')
  })

  it('reloads only once in a row, so a broken build cannot loop', () => {
    setup()
    window.dispatchEvent(new Event('vite:preloadError'))
    window.dispatchEvent(new Event('vite:preloadError'))

    expect(reload).toHaveBeenCalledOnce()
  })
})
