import { nextProductsPage, PRODUCTS_PAGE_SIZE } from './product-picker'

const page = (total: number) => ({ items: [], total })

describe('nextProductsPage', () => {
  it('asks for the next page while products remain', () => {
    expect(nextProductsPage(page(PRODUCTS_PAGE_SIZE + 1), 1)).toBe(2)
  })

  it('stops once every product is loaded', () => {
    expect(nextProductsPage(page(PRODUCTS_PAGE_SIZE), 1)).toBeNull()
    expect(nextProductsPage(page(0), 1)).toBeNull()
  })
})
