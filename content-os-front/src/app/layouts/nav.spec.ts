import type { Me, Role } from '@/entities/session'
import { router } from '../router'
import { isNavItemActive, navFor, sidebarNav } from './nav'

function approved(role: Role): Me {
  return {
    id: '1',
    email: 'anna@example.com',
    role,
    status: 'approved',
    name: 'Anna',
    photo_url: null,
    onboarding_step: null,
  }
}

function labels(role: Role) {
  const { sidebar, tabbar } = navFor(router, approved(role))
  return { sidebar: sidebar.map((i) => i.label), tabbar: tabbar.map((i) => i.label) }
}

describe('navFor', () => {
  it('shows brands only Home, Products and Content, all in the tab bar', () => {
    expect(labels('brand')).toEqual({
      sidebar: ['Home', 'Products', 'Content'],
      tabbar: ['Home', 'Products', 'Content'],
    })
  })

  it('shows the team every section and picks four for the tab bar', () => {
    expect(labels('creator')).toEqual({
      sidebar: ['Home', 'My tasks', 'Shoots', 'Products', 'Content', 'References', 'Activity'],
      tabbar: ['Home', 'My tasks', 'Shoots', 'Content'],
    })
  })

  it('keeps a section highlighted on the screens nested in it', () => {
    const products = sidebarNav.find((item) => item.label === 'Products')!
    const home = sidebarNav.find((item) => item.label === 'Home')!
    const createProduct = router.resolve({ name: 'product-create' })

    expect(isNavItemActive(router, products, createProduct)).toBe(true)
    expect(isNavItemActive(router, home, createProduct)).toBe(false)
    expect(isNavItemActive(router, products, router.resolve({ name: 'products' }))).toBe(true)
  })
})
