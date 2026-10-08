import type { Me } from '@/entities/session'
import { profileFields } from './profile'

const me: Me = {
  id: '1',
  email: 'amina@example.com',
  role: 'creator',
  status: 'approved',
  name: 'Amina',
  photo_url: null,
  is_admin: false,
  onboarding_step: null,
}

describe('profileFields', () => {
  it('lists the name and the email', () => {
    expect(profileFields(me)).toEqual([
      { label: 'Name', value: 'Amina' },
      { label: 'Email address', value: 'amina@example.com' },
    ])
  })

  it('leaves a missing name empty', () => {
    expect(profileFields({ ...me, name: null })[0]).toEqual({ label: 'Name', value: '' })
  })
})
