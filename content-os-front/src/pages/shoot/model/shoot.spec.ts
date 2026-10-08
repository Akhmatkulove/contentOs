import { shootDetails } from './fixtures'
import {
  assigneesLabel,
  coverPhotos,
  defaultTaskFilters,
  findProducts,
  findTasks,
  shootCounts,
  shootFacts,
  shootPeople,
  toProducts,
  toTasks,
} from './shoot'

const shoot = shootDetails()

describe('toProducts', () => {
  it('joins collection and category and works out the progress', () => {
    const [abaya, dress] = toProducts(shoot)
    expect(abaya).toMatchObject({
      subtitle: 'Autumn Drop · Abayas',
      photoUrl: 'abaya.webp',
      percent: 50,
    })
    expect(dress).toMatchObject({ subtitle: '', collection: '', photoUrl: null, percent: 0 })
  })
})

describe('toTasks', () => {
  it('numbers the deliverables and resolves products and references', () => {
    const [first, second] = toTasks(shoot)
    expect(first).toMatchObject({
      number: 1,
      product: { id: 'p1', name: 'Black Abaya 042', photoUrl: 'abaya.webp' },
      references: [{ id: 'r1', title: 'Walk', kind: 'video', previewUrl: null }],
      dueDate: '2024-09-19',
    })
    expect(second).toMatchObject({ number: 2, references: [], dueDate: '' })
  })
})

describe('shootPeople', () => {
  it('lists the art director, creators and the mobilographer with roles', () => {
    expect(shootPeople(shoot).map((p) => `${p.member.name}: ${p.role}`)).toEqual([
      'Risolat: Art Director',
      'Amina: Creator',
      'Odina: Mobilographer',
    ])
    expect(shootPeople(shootDetails({ mobilographer: null }))).toHaveLength(2)
  })
})

describe('shootCounts', () => {
  it('counts the deliverables by status', () => {
    expect(shootCounts(toTasks(shoot))).toEqual({
      total: 3,
      approved: 1,
      to_shoot: 2,
      in_progress: 0,
      needs_review: 0,
      needs_changes: 0,
    })
  })
})

describe('shootFacts', () => {
  it('formats date, time and duration', () => {
    expect(shootFacts(shoot)).toEqual({
      date: 'Sep 18, 2024',
      startTime: '10:00',
      location: 'Tashkent Studio',
      duration: '6 h',
    })
  })
})

describe('coverPhotos', () => {
  it('takes product photos up to the limit and counts the rest', () => {
    const products = toProducts(shoot)
    expect(coverPhotos(products, 5)).toEqual({
      photos: [{ id: 'p1', name: 'Black Abaya 042', url: 'abaya.webp' }],
      more: 0,
    })
    const many = Array.from({ length: 7 }, (_, i) => ({ ...products[0]!, id: `p${i}` }))
    expect(coverPhotos(many, 5).more).toBe(2)
  })
})

describe('findProducts', () => {
  const products = toProducts(shoot)
  it('searches name, collection and category', () => {
    expect(findProducts(products, 'abayas', 'order').map((p) => p.id)).toEqual(['p1'])
  })
  it('sorts by name and by progress', () => {
    expect(findProducts(products, '', 'name_desc').map((p) => p.id)).toEqual(['p2', 'p1'])
    expect(findProducts(products, '', 'progress').map((p) => p.id)).toEqual(['p1', 'p2'])
  })
})

describe('findTasks', () => {
  const tasks = toTasks(shoot)
  const names = (filters: Partial<typeof defaultTaskFilters>) =>
    findTasks(tasks, { ...defaultTaskFilters, ...filters }).map((task) => task.name)

  it('searches task, product and assignee names', () => {
    expect(names({ search: 'cream' })).toEqual(['Story clips'])
    expect(names({ search: 'amina' })).toEqual(['Detail movement'])
  })
  it('filters by product, assignee and status', () => {
    expect(names({ productId: 'p2' })).toEqual(['Story clips'])
    expect(names({ assigneeId: 'amina' })).toEqual(['Detail movement'])
    expect(names({ status: 'approved' })).toEqual(['Fabric close-up'])
  })
  it('sorts by due date with undated tasks last', () => {
    expect(names({ sort: 'due_soon' })).toEqual([
      'Story clips',
      'Fabric close-up',
      'Detail movement',
    ])
  })
})

describe('assigneesLabel', () => {
  it('names the first and counts the rest', () => {
    const [, second] = toTasks(shoot)
    expect(assigneesLabel(second!.assignees)).toBe('Amina +1')
    expect(assigneesLabel([])).toBe('')
  })
})
