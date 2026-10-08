import { shootDetails } from './fixtures'
import {
  assigneesLabel,
  coverPhotos,
  defaultReferenceFilters,
  defaultTaskFilters,
  findProducts,
  findReferences,
  findTeam,
  referenceUsage,
  findTasks,
  shootCounts,
  shootFacts,
  shootPeople,
  toProducts,
  tasksLabel,
  teamCards,
  teamSummary,
  toTasks,
  usageLabel,
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

describe('findReferences', () => {
  const walk = shoot.references[0]!
  const references = [
    walk,
    {
      ...walk,
      id: 'r2',
      title: 'Light',
      type: 'image' as const,
      product_id: 'p1',
      tags: ['soft'],
      created_at: '2024-09-02T00:00:00Z',
    },
    {
      ...walk,
      id: 'r3',
      title: null,
      type: 'moodboard' as const,
      created_at: '2024-08-01T00:00:00Z',
    },
  ]
  const ids = (filters: Partial<typeof defaultReferenceFilters>) =>
    findReferences([...references], { ...defaultReferenceFilters, ...filters }).map((r) => r.id)

  it('searches titles and tags', () => {
    expect(ids({ search: 'soft' })).toEqual(['r2'])
  })
  it('filters by product and type', () => {
    expect(ids({ productId: 'p1' })).toEqual(['r2'])
    expect(ids({ type: 'moodboard' })).toEqual(['r3'])
  })
  it('sorts by date and by name with untitled last', () => {
    expect(ids({})).toEqual(['r2', 'r1', 'r3'])
    expect(ids({ sort: 'oldest' })).toEqual(['r3', 'r1', 'r2'])
    expect(ids({ sort: 'title_asc' })).toEqual(['r2', 'r1', 'r3'])
  })
})

describe('referenceUsage', () => {
  it('counts the deliverables that follow each reference', () => {
    expect(referenceUsage(shoot)).toEqual(new Map([['r1', 1]]))
  })
  it('labels used and unused references', () => {
    expect(usageLabel(0)).toBe('Assigned to this shoot')
    expect(usageLabel(1)).toBe('Used in 1 deliverable')
    expect(usageLabel(2)).toBe('Used in 2 deliverables')
  })
})

describe('team', () => {
  const cards = teamCards(shoot)

  it("counts each member's tasks; the art director oversees all", () => {
    expect(cards.map((card) => tasksLabel(card))).toEqual([
      'Oversees 3 deliverables',
      '1 task assigned',
      '2 tasks assigned',
    ])
  })
  it('sums the team up', () => {
    expect(teamSummary(shoot)).toEqual({ members: 3, creators: 1, tasks: 2, mobilographers: 1 })
  })
  it('searches names, roles and responsibilities and filters by role', () => {
    const names = (search: string, role = 'all') =>
      findTeam(cards, search, role).map((card) => card.member.name)
    expect(names('camera')).toEqual(['Odina'])
    expect(names('', 'Creator')).toEqual(['Amina'])
    expect(names('risolat')).toEqual(['Risolat'])
  })
})
