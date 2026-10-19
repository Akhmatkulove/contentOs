import { shootDetails } from './fixtures'
import { findTeam, tasksLabel, teamCards, teamSummary } from './team-tab'

const shoot = shootDetails()

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
  it("shows each member's responsibilities line by line; the art director's are fixed", () => {
    expect(cards.map((card) => [card.responsibilities, card.responsibilitiesText])).toEqual([
      [['Creative direction', 'Shot list & moodboard approval', 'Final review and sign-off'], null],
      [[], ''],
      [['Manage camera equipment', 'Back up files'], 'Manage camera equipment\nBack up files'],
    ])
  })
  it('searches names, roles and responsibilities and filters by role', () => {
    const names = (search: string, role = 'all') =>
      findTeam(cards, search, role).map((card) => card.member.name)
    expect(names('camera')).toEqual(['Odina'])
    expect(names('', 'Creator')).toEqual(['Amina'])
    expect(names('risolat')).toEqual(['Risolat'])
  })
})
