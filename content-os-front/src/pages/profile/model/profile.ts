import { computed } from 'vue'
import { roleLabels, useSessionStore, type Me } from '@/entities/session'

export interface ProfileField {
  label: string
  value: string
}

// The "Personal information" grid. Figma also has last name, username, phone,
// city and the About card.
// TODO(api): last name, username, phone, city, about — the user has only a name and an email.
export function profileFields(me: Me): ProfileField[] {
  return [
    { label: 'Name', value: me.name ?? '' },
    { label: 'Email address', value: me.email },
  ]
}

// The page shows the signed-in user: everything comes from /me, no request of its own.
export function useProfile() {
  const session = useSessionStore()

  const profile = computed(() => {
    const me = session.me
    if (!me) return null
    return {
      name: me.name ?? '',
      photoUrl: me.photo_url,
      role: me.role ? roleLabels[me.role] : '',
      fields: profileFields(me),
    }
  })

  return { profile }
}
