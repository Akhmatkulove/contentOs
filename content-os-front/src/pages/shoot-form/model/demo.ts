import type { ShootDeliverable, TeamMember } from './shoot-draft'

// TODO(api): demo content of the Figma mockup, so the layout can be reviewed
// before the shoots API exists. Remove together with its import in shoot-form.ts.

const amina: TeamMember = { id: 'demo-amina', name: 'Amina', photo_url: null }
const odina: TeamMember = { id: 'demo-odina', name: 'Odina', photo_url: null }

const deliverable = (
  id: string,
  name: string,
  productName: string,
  assignee: TeamMember,
): ShootDeliverable => ({
  id,
  name,
  product: { name: productName, photoUrl: null },
  reference: { title: name, previewUrl: null },
  assignee,
  dueDate: '2024-09-18',
  status: 'planned',
})

export const demoDeliverables: ShootDeliverable[] = [
  deliverable('demo-d1', 'Walking transition', 'Black Abaya 042', amina),
  deliverable('demo-d2', 'Fabric close-up', 'Sand Abaya 017', odina),
  deliverable('demo-d3', 'Lifestyle framing', 'Cream Dress 011', amina),
  deliverable('demo-d4', 'Detail movement', 'Black Abaya 042', odina),
  deliverable('demo-d5', 'Story clips', 'Olive Set 003', amina),
  deliverable('demo-d6', 'Full outfit', 'Sand Abaya 017', amina),
]
