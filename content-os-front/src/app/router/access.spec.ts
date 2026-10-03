import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore, type Me } from '@/entities/session'
import { ApiError, http } from '@/shared/api'
import { router } from '.'
import { accessRedirect, installAccessGuard, installSessionInterceptor } from './access'

function me(overrides: Partial<Me> = {}): Me {
  return {
    id: '1',
    email: 'anna@example.com',
    role: null,
    status: 'onboarding',
    name: null,
    photo_url: null,
    is_admin: false,
    onboarding_step: 'role',
    ...overrides,
  }
}

function redirect(path: string, user: Me | null) {
  const result = accessRedirect(router.resolve(path), user)
  return result === true ? true : router.resolve(result).name
}

describe('accessRedirect', () => {
  it('sends guests to login from everywhere but login, signup and 404', () => {
    expect(redirect('/', null)).toBe('login')
    expect(redirect('/onboarding/role', null)).toBe('login')
    expect(redirect('/onboarding/status', null)).toBe('login')
    expect(redirect('/login', null)).toBe(true)
    expect(redirect('/signup', null)).toBe(true)
    expect(redirect('/nope', null)).toBe(true)
  })

  it('keeps signed-in users away from login and signup', () => {
    expect(redirect('/login', me())).toBe('onboarding-role')
    expect(redirect('/signup', me({ status: 'approved' }))).toBe('home')
  })

  it('lets onboarding users revisit filled steps but not skip ahead', () => {
    const atProfile = me({ role: 'creator', onboarding_step: 'profile' })
    expect(redirect('/onboarding/role', atProfile)).toBe(true)
    expect(redirect('/onboarding/profile', atProfile)).toBe(true)
    expect(redirect('/onboarding/review', atProfile)).toBe('onboarding-profile')
    expect(redirect('/onboarding/status', atProfile)).toBe('onboarding-profile')
    expect(redirect('/', atProfile)).toBe('onboarding-profile')
  })

  it.each(['pending_review', 'rejected'] as const)(
    'keeps %s applications on the status page',
    (status) => {
      const sent = me({ status, onboarding_step: null })
      expect(redirect('/onboarding/status', sent)).toBe(true)
      expect(redirect('/onboarding/review', sent)).toBe('onboarding-status')
      expect(redirect('/', sent)).toBe('onboarding-status')
    },
  )

  it('opens the product only to approved users', () => {
    const approved = me({ status: 'approved', onboarding_step: null })
    expect(redirect('/', approved)).toBe(true)
    expect(redirect('/onboarding/status', approved)).toBe('home')
    expect(redirect('/onboarding/role', approved)).toBe('home')
  })

  it('keeps brands to Home, Products and Content', () => {
    const brand = me({ role: 'brand', status: 'approved', onboarding_step: null })
    for (const path of ['/', '/products', '/content']) expect(redirect(path, brand)).toBe(true)
    for (const path of ['/tasks', '/shoots', '/references', '/activity']) {
      expect(redirect(path, brand)).toBe('home')
    }
  })

  it('keeps the admin to the admin panel', () => {
    const admin = me({ status: 'approved', onboarding_step: null, is_admin: true })
    expect(redirect('/admin', admin)).toBe(true)
    for (const path of ['/', '/products', '/onboarding/role', '/login']) {
      expect(redirect(path, admin)).toBe('admin')
    }
  })

  it('hides the admin panel from everyone else', () => {
    expect(redirect('/admin', null)).toBe('login')
    expect(
      redirect('/admin', me({ role: 'brand', status: 'approved', onboarding_step: null })),
    ).toBe('home')
  })

  it.each(['art_director', 'creator'] as const)('opens every section to %s', (role) => {
    const user = me({ role, status: 'approved', onboarding_step: null })
    for (const path of ['/', '/tasks', '/shoots', '/products', '/content', '/activity']) {
      expect(redirect(path, user)).toBe(true)
    }
  })
})

describe('session interceptor', () => {
  const stubRouter = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/login', name: 'login', component: { template: '<div />' } },
      { path: '/status', name: 'onboarding-status', component: { template: '<div />' } },
    ],
  })
  installSessionInterceptor(stubRouter)

  function reject(status: number) {
    const response = { status, data: {}, headers: {}, config: {} } as AxiosResponse
    const error = new AxiosError('failed', undefined, undefined, undefined, response)
    // Run the request through the real interceptor chain with a failing adapter.
    return http.get('/anything', {
      adapter: () => Promise.reject(error),
      headers: new AxiosHeaders(),
    })
  }

  beforeEach(async () => {
    setActivePinia(createPinia())
    await stubRouter.push('/')
  })

  it('drops the session and goes to login on 401', async () => {
    const session = useSessionStore()
    session.set(me({ status: 'approved' }))

    await expect(reject(401)).rejects.toBeInstanceOf(ApiError)

    expect(session.me).toBeNull()
    expect(stubRouter.currentRoute.value.name).toBe('login')
  })

  it('reloads the user and moves them where they belong on 403', async () => {
    const session = useSessionStore()
    session.set(me({ status: 'approved' }))
    vi.spyOn(session, 'load').mockImplementation(async () => {
      session.set(me({ status: 'rejected', onboarding_step: null }))
      return session.me
    })

    await expect(reject(403)).rejects.toBeInstanceOf(ApiError)

    expect(stubRouter.currentRoute.value.name).toBe('onboarding-status')
  })

  it('leaves 401 alone without a session (wrong password)', async () => {
    const session = useSessionStore()
    session.clear()

    await expect(reject(401)).rejects.toBeInstanceOf(ApiError)

    expect(stubRouter.currentRoute.value.name).toBe('home')
  })
})

describe('access guard', () => {
  const stubRouter = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: { template: '<div />' } },
      {
        path: '/signup',
        name: 'signup',
        component: { template: '<div />' },
        meta: { access: 'guest' },
      },
      { path: '/error', name: 'server-error', component: { template: '<div />' } },
    ],
  })
  installAccessGuard(stubRouter)

  beforeEach(() => setActivePinia(createPinia()))

  it('opens the 500 page, keeping the path, when /me fails', async () => {
    vi.spyOn(useSessionStore(), 'load').mockRejectedValue(new Error('down'))

    await stubRouter.push('/signup?ref=ad')

    expect(stubRouter.currentRoute.value.name).toBe('server-error')
    expect(stubRouter.currentRoute.value.query.from).toBe('/signup?ref=ad')
  })
})
