import * as v from 'valibot'
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import { usePickedFiles } from '@/shared/lib'
import type { IconName } from '@/shared/ui/icon'
import type { SegmentedOption } from '@/shared/ui/segmented'
import type { SelectOption } from '@/shared/ui/select'
import { toast } from '@/shared/ui/toast'
import type { ReferenceDraft, ReferenceSource, ReferenceType } from './reference-draft'
import { IMAGE_ACCEPT, isVideo, tooLarge, tooLargeMessage, VIDEO_ACCEPT } from './uploads'

export type { ReferenceSource } from './reference-draft'

export const sourceOptions: SegmentedOption<ReferenceSource>[] = [
  { value: 'upload', label: 'Upload files', icon: 'upload-square-02' },
  { value: 'link', label: 'Paste link', icon: 'copy-link' },
]

export const fileAccept = `${IMAGE_ACCEPT},${VIDEO_ACCEPT}`

export const typeOptions = [
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'moodboard', label: 'Moodboard' },
] as const satisfies readonly (SelectOption & { value: ReferenceType })[]

// The type the uploaded files suggest: only videos make a video, only images
// an image, images with videos a moodboard.
export function typeForFiles(files: File[]): ReferenceType | undefined {
  if (!files.length) return undefined
  if (files.every(isVideo)) return 'video'
  return files.some(isVideo) ? 'moodboard' : 'image'
}

export function rejectedFilesMessage(count: number): string {
  return count === 1
    ? 'This file is not an image or a video.'
    : `${count} files are not images or videos.`
}

// Same rule as the backend: http(s) only.
export const linkSchema = v.pipe(
  v.string(),
  v.trim(),
  v.nonEmpty('Paste a link.'),
  v.url('Enter a valid link.'),
  v.regex(/^https?:\/\//i, 'Enter a link starting with http:// or https://.'),
)

// A reference needs either files or a link, depending on the source.
export function referenceErrors(source: ReferenceSource, fileCount: number, link: string) {
  if (source === 'upload') return { files: fileCount ? '' : 'Add at least one file.', link: '' }
  const result = v.safeParse(linkSchema, link)
  return { files: '', link: result.success ? '' : result.issues[0].message }
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

export function useAddReferenceForm() {
  const source = ref<ReferenceSource>('upload')

  const form = reactive({
    link: '',
    title: '',
    type: undefined as ReferenceType | undefined,
    tags: [] as string[],
    notes: '',
    favorite: false,
  })

  const { files, add, remove: removeFile } = usePickedFiles()

  function addFiles(picked: File[]) {
    const large = picked.filter(tooLarge)
    if (large.length) toast.error(tooLargeMessage(large.length))
    add(picked.filter((file) => !tooLarge(file)))
  }

  // The type follows the files until the user picks one in the select.
  let typeChosen = false
  watch(files, (list) => {
    if (!typeChosen) form.type = typeForFiles(list.map((item) => item.file))
  })

  // VSelect emits a plain string; it only offers typeOptions.
  function chooseType(type: string | undefined) {
    form.type = type as ReferenceType | undefined
    typeChosen = true
  }

  // Previews not shown yet; the reference can't be added until they are.
  const loadedIds = reactive(new Set<string>())
  const loading = computed(
    () => source.value === 'upload' && files.value.some((item) => !loadedIds.has(item.id)),
  )

  function markLoaded(id: string) {
    loadedIds.add(id)
  }

  function rejectFiles(rejected: File[]) {
    toast.error(rejectedFilesMessage(rejected.length))
  }

  // TODO(api): fetch the preview for form.link (title, thumbnail, source).
  const linkPreview = shallowRef<LinkPreview | null>(null)

  function removeLink() {
    form.link = ''
    linkPreview.value = null
  }

  // Errors show after the first submit and go away as soon as the field is fixed.
  const submitted = ref(false)
  const errors = computed(() =>
    submitted.value
      ? referenceErrors(source.value, files.value.length, form.link)
      : { files: '', link: '' },
  )

  // The draft to hand to the product page, or null while something is missing.
  function submit(): ReferenceDraft | null {
    if (loading.value) return null
    submitted.value = true
    if (errors.value.files || errors.value.link) return null
    const upload = source.value === 'upload'
    return {
      id: crypto.randomUUID(),
      source: source.value,
      files: upload ? files.value.map((item) => item.file) : [],
      link: upload ? '' : form.link.trim(),
      title: form.title.trim(),
      type: form.type,
      tags: form.tags,
      notes: form.notes.trim(),
    }
  }

  return {
    source,
    form,
    errors,
    files,
    addFiles,
    removeFile,
    rejectFiles,
    chooseType,
    loading,
    markLoaded,
    linkPreview,
    removeLink,
    submit,
  }
}
