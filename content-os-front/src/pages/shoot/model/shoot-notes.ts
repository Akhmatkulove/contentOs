import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { computed, defineAsyncComponent, ref, toValue, type MaybeRefOrGetter } from 'vue'
import { confirmAction } from '@/shared/ui/confirm-modal'
import { openModal } from '@/shared/ui/modal'
import { toast } from '@/shared/ui/toast'
import {
  createNote,
  deleteNote,
  fetchNotes,
  pinNote,
  updateNote,
  type ShootNote,
  type ShootNoteBody,
} from '../api/notes'
import { findNotes, type NoteFilter } from './notes'
import { ALL, type TeamMember } from './shoot'

// The modal's code loads on first open.
const NoteModal = defineAsyncComponent(() => import('../ui/NoteModal.vue'))

export const notesKey = (shootId: string) => ['shoots', shootId, 'notes'] as const

// The Notes tab (docs/adr/0010): the notes, their search and filter, and the
// New note / Edit / Pin / Delete actions.
export function useShootNotes(
  shootId: () => string,
  team: MaybeRefOrGetter<TeamMember[]>,
  active: () => boolean,
) {
  const queryCache = useQueryCache()
  // Loads when the tab is opened.
  const { data, isLoading } = useQuery({
    key: () => notesKey(shootId()),
    query: () => fetchNotes(shootId()),
    enabled: active,
  })
  const notes = computed(() => data.value ?? [])

  const search = ref('')
  const filter = ref<NoteFilter>(ALL)
  const found = computed(() => findNotes(notes.value, search.value, filter.value))
  const pinned = computed(() => found.value.filter((note) => note.pinned))
  const others = computed(() => found.value.filter((note) => !note.pinned))

  const refresh = () => queryCache.invalidateQueries({ key: notesKey(shootId()) })

  const { mutateAsync: save } = useMutation({
    mutation: ({ note, body }: { note?: ShootNote; body: ShootNoteBody }) =>
      note ? updateNote(shootId(), note.id, body) : createNote(shootId(), body),
    onSuccess: (_, { note }) => {
      toast.success(note ? 'Note saved' : 'Note created')
      return refresh()
    },
  })
  const { mutate: pin } = useMutation({
    mutation: (note: ShootNote) => pinNote(shootId(), note.id, !note.pinned),
    onSuccess: (saved) => {
      toast.success(saved.pinned ? 'Note pinned' : 'Note unpinned')
      return refresh()
    },
  })
  const { mutate: deleteNow } = useMutation({
    mutation: (note: ShootNote) => deleteNote(shootId(), note.id),
    onSuccess: () => {
      toast.success('Note deleted')
      return refresh()
    },
  })

  // Delete asks first: a deleted note can't be brought back.
  async function remove(note: ShootNote) {
    const confirmed = await confirmAction({
      title: 'Delete note?',
      description: `“${note.title}” will be deleted for the whole team. This can’t be undone.`,
      confirmLabel: 'Delete',
    })
    if (confirmed) deleteNow(note)
  }

  // New note without `note`; Edit with it.
  async function openForm(note?: ShootNote) {
    const body = await openModal(NoteModal, { team: toValue(team), note })
    if (body) await save({ note, body })
  }

  return {
    notes,
    loading: computed(() => isLoading.value && data.value === undefined),
    search,
    filter,
    pinned,
    others,
    openForm,
    pin,
    remove,
  }
}
