import { shootDetails } from './fixtures'
import { toProducts } from './products-tab'
import { shootPeople } from './shoot'
import {
  assigneesLabel,
  defaultTaskFilters,
  findTasks,
  taskFilterOptions,
  toTasks,
} from './tasks-tab'

const shoot = shootDetails()

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

describe('taskFilterOptions', () => {
  it('offers the products and everyone but the art director as assignees', () => {
    const options = taskFilterOptions(toProducts(shoot), shootPeople(shoot))
    expect(options.products.map((o) => o.value)).toEqual(['all', 'p1', 'p2'])
    expect(options.assignees.map((o) => o.label)).toEqual(['All assignees', 'Amina', 'Odina'])
  })
})
