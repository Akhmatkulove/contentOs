import {
  assignCandidates,
  buildDirectory,
  canAssign,
  linkRef,
  matchesSearch,
  partnerNoun,
  sectionsOf,
  type ManagedUser,
} from './directory'

function user(id: string, overrides: Partial<ManagedUser> = {}): ManagedUser {
  return {
    id,
    email: `${id}@example.com`,
    name: null,
    role: null,
    status: 'approved',
    photo_url: null,
    created_at: '2026-10-01T10:00:00Z',
    ...overrides,
  }
}

const brand = user('brand', { role: 'brand', name: 'Acme' })
const otherBrand = user('other', { role: 'brand' })
const director = user('ad', { role: 'art_director', name: 'Dana' })
const pendingDirector = user('ad2', { role: 'art_director', status: 'pending_review' })
const freeDirector = user('ad3', { role: 'art_director' })
const creator = user('creator', { role: 'creator' })
const freeCreator = user('creator2', { role: 'creator' })
const newcomer = user('new', { status: 'onboarding' })

const at = '2026-10-02T10:00:00Z'
const directory = buildDirectory({
  users: [
    brand,
    otherBrand,
    director,
    pendingDirector,
    freeDirector,
    creator,
    freeCreator,
    newcomer,
  ],
  brand_art_directors: [
    { brand_id: 'brand', art_director_id: 'ad', assigned_at: at },
    { brand_id: 'other', art_director_id: 'ad', assigned_at: at },
  ],
  art_director_creators: [{ art_director_id: 'ad', creator_id: 'creator', assigned_at: at }],
})

const entry = (tab: keyof typeof directory, id: string) =>
  directory[tab].find((e) => e.user.id === id)!

describe('buildDirectory', () => {
  it('splits users by role, keeping those without one apart', () => {
    expect(directory.brand.map((e) => e.user.id)).toEqual(['brand', 'other'])
    expect(directory.art_director.map((e) => e.user.id)).toEqual(['ad', 'ad2', 'ad3'])
    expect(directory.creator.map((e) => e.user.id)).toEqual(['creator', 'creator2'])
    expect(directory.none.map((e) => e.user.id)).toEqual(['new'])
  })

  it('links users both ways', () => {
    expect(entry('brand', 'brand').artDirectors).toEqual([director])
    expect(entry('art_director', 'ad').brands).toEqual([brand, otherBrand])
    expect(entry('art_director', 'ad').creators).toEqual([creator])
    expect(entry('creator', 'creator').artDirectors).toEqual([director])
    expect(entry('art_director', 'ad3').creators).toEqual([])
  })
})

describe('sectionsOf', () => {
  it('gives an art director brands to see and creators to assign', () => {
    const [brands, creators] = sectionsOf(entry('art_director', 'ad'))
    expect(brands).toMatchObject({ kind: 'brand-art-director', owner: false })
    expect(creators).toMatchObject({ kind: 'art-director-creator', owner: true })
    expect(canAssign(brands!, director)).toBe(false)
    expect(canAssign(creators!, director)).toBe(true)
    expect(canAssign(creators!, pendingDirector)).toBe(false)
  })

  it('names the partner by its role from either side', () => {
    const [brands, creators] = sectionsOf(entry('art_director', 'ad'))
    const [artDirectors] = sectionsOf(entry('creator', 'creator'))
    expect(partnerNoun(brands!)).toBe('brand')
    expect(partnerNoun(creators!)).toBe('creator')
    expect(partnerNoun(artDirectors!)).toBe('art director')
  })

  it('shows nothing for users without a role', () => {
    expect(sectionsOf(entry('none', 'new'))).toEqual([])
  })

  it('builds the link from either side the same way', () => {
    const [fromBrand] = sectionsOf(entry('brand', 'brand'))
    const [fromDirector] = sectionsOf(entry('art_director', 'ad'))
    const expected = { kind: 'brand-art-director', ownerId: 'brand', memberId: 'ad' }
    expect(linkRef(fromBrand!, brand, director)).toEqual(expected)
    expect(linkRef(fromDirector!, director, brand)).toEqual(expected)
  })
})

describe('assignCandidates', () => {
  it('offers only approved users of the role not linked yet', () => {
    const [artDirectors] = sectionsOf(entry('brand', 'brand'))
    expect(assignCandidates(directory, artDirectors!)).toEqual([freeDirector])
    const [, creators] = sectionsOf(entry('art_director', 'ad'))
    expect(assignCandidates(directory, creators!)).toEqual([freeCreator])
  })
})

describe('matchesSearch', () => {
  it('looks in name and email, ignoring case and edges', () => {
    expect(matchesSearch(brand, '  acm ')).toBe(true)
    expect(matchesSearch(brand, 'BRAND@')).toBe(true)
    expect(matchesSearch(brand, 'dana')).toBe(false)
    expect(matchesSearch(brand, '')).toBe(true)
  })
})
