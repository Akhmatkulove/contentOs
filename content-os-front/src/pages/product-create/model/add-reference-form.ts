import { reactive, ref, shallowRef } from 'vue'
import { usePickedFiles } from '@/shared/lib'
import type { IconName } from '@/shared/ui/icon'
import type { SelectOption } from '@/shared/ui/select'
import { toast } from '@/shared/ui/toast'

// A reference comes either from files or from a link to a post.
export type ReferenceSource = 'upload' | 'link'

export const fileAccept = 'image/*,video/*'

// TODO(api): reference types from the backend enum.
export const typeOptions: SelectOption[] = [
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'moodboard', label: 'Moodboard' },
]

export function rejectedFilesMessage(count: number): string {
  return count === 1
    ? 'This file is not an image or a video.'
    : `${count} files are not images or videos.`
}

// What the backend tells about a pasted link.
export interface LinkPreview {
  title: string
  thumbnail: string
  // Line under the title, e.g. "Instagram · Video".
  source: string
  sourceIcon: IconName
  video: boolean
}

// Layout only for now: the fields keep what the user enters, nothing is sent.
export function useAddReferenceForm() {
  const source = ref<ReferenceSource>('upload')

  // TODO(api): references endpoint. Replace with the request type from `Schemas`.
  const form = reactive({
    link: '',
    title: '',
    type: undefined as string | undefined,
    product: undefined as string | undefined,
    shoot: undefined as string | undefined,
    creator: undefined as string | undefined,
    tags: [] as string[],
    collection: undefined as string | undefined,
    notes: '',
    favorite: false,
  })

  // TODO(api): options for products, shoots, creators and collections.
  const productOptions: SelectOption[] = []
  const shootOptions: SelectOption[] = []
  const creatorOptions: SelectOption[] = []
  const collectionOptions: SelectOption[] = []

  const { files, add: addFiles, remove: removeFile } = usePickedFiles()

  function rejectFiles(rejected: File[]) {
    toast.error(rejectedFilesMessage(rejected.length))
  }

  // TODO(api): fetch the preview for form.link (title, thumbnail, source).
  const linkPreview = shallowRef<LinkPreview | null>(null)

  function removeLink() {
    form.link = ''
    linkPreview.value = null
  }

  // TODO(api): create the reference with useMutation, then close the modal with it.
  function submit() {}

  return {
    source,
    form,
    productOptions,
    shootOptions,
    creatorOptions,
    collectionOptions,
    files,
    addFiles,
    removeFile,
    rejectFiles,
    linkPreview,
    removeLink,
    submit,
  }
}
