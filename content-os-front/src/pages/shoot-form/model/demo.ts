import type { ShootDeliverable, ShootProduct, ShootReference, TeamMember } from './shoot-draft'

// TODO(api): demo content of the Figma mockup, so the layout can be reviewed
// before the shoots API exists. Remove together with its import in shoot-form.ts.

const risolat: TeamMember = { id: 'demo-risolat', name: 'Risolat', photo_url: null }
const amina: TeamMember = { id: 'demo-amina', name: 'Amina', photo_url: null }
const lana: TeamMember = { id: 'demo-lana', name: 'Lana', photo_url: null }
const daria: TeamMember = { id: 'demo-daria', name: 'Daria', photo_url: null }
const odina: TeamMember = { id: 'demo-odina', name: 'Odina', photo_url: null }

export const demoTeam = {
  artDirector: risolat,
  creators: [amina, lana, daria],
  mobilographer: odina,
}

export const demoProducts: ShootProduct[] = [
  { id: 'demo-p1', name: 'Black Abaya 042', collection: 'Autumn 26', photoUrl: null },
  { id: 'demo-p2', name: 'Cream Dress 011', collection: 'Autumn 26', photoUrl: null },
  { id: 'demo-p3', name: 'Olive Set 003', collection: 'Everyday', photoUrl: null },
  { id: 'demo-p4', name: 'Sand Abaya 017', collection: 'Autumn 26', photoUrl: null },
]

export const demoReferences: ShootReference[] = [
  {
    id: 'demo-r1',
    title: 'Walking transition',
    source: 'instagram',
    previewUrl: null,
    durationSec: 15,
    productName: 'Black Abaya 042',
  },
  {
    id: 'demo-r2',
    title: 'Fabric close-up',
    source: 'tiktok',
    previewUrl: null,
    durationSec: 26,
    productName: 'Sand Abaya 017',
  },
  {
    id: 'demo-r3',
    title: 'Lifestyle framing',
    source: 'instagram',
    previewUrl: null,
    durationSec: null,
    productName: 'Cream Dress 011',
  },
  {
    id: 'demo-r4',
    title: 'Mood reference',
    source: 'upload',
    previewUrl: null,
    durationSec: null,
    productName: 'Olive Set 003',
  },
]

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
