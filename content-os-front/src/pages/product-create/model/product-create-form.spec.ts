import * as v from 'valibot'
import type { PickedFile } from '@/shared/lib'
import { productSchema, splitBySizes } from './product-create-form'

const photo = { id: '1', file: new File(['x'], 'a.jpg'), url: 'blob:a' } as PickedFile

function fieldErrors(input: { name: string; about: string; photos: PickedFile[] }) {
  const result = v.safeParse(productSchema, input)
  return result.success ? {} : v.flatten<typeof productSchema>(result.issues).nested
}

describe('productSchema', () => {
  it('needs a name, an about and at least one photo', () => {
    expect(fieldErrors({ name: '  ', about: '', photos: [] })).toEqual({
      name: ['Enter the product name.'],
      about: ['Describe the product.'],
      photos: ['Add at least one photo.'],
    })
  })

  it('accepts a filled product and trims the text', () => {
    expect(v.parse(productSchema, { name: ' Serum ', about: ' Daily ', photos: [photo] })).toEqual({
      name: 'Serum',
      about: 'Daily',
      photos: [photo],
    })
  })
})

describe('splitBySizes', () => {
  it('cuts a flat list back into chunks', () => {
    expect(splitBySizes(['a', 'b', 'c', 'd'], [1, 0, 3])).toEqual([['a'], [], ['b', 'c', 'd']])
  })
})
