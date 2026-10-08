import { shootDetails } from './fixtures'
import { toProducts } from './products-tab'
import { coverPhotos, shootCounts, shootFacts, shootPeople } from './shoot'
import { toTasks } from './tasks-tab'

const shoot = shootDetails()

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
