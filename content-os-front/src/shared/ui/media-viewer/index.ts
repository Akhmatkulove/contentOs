import { defineAsyncComponent } from 'vue'
import { openModal } from '@/shared/ui/modal'

// The viewer's code loads on first open.
const VMediaViewer = defineAsyncComponent(() => import('./v-media-viewer.vue'))

export interface MediaFile {
  id: string
  url: string
  kind: 'image' | 'video'
}

export interface MediaViewerOptions {
  files: MediaFile[]
  // The file it opens on.
  start: number
  title: string
}

// Files fullscreen, one at a time, with zoom and a strip of thumbnails.
export function openMediaViewer(options: MediaViewerOptions): void {
  void openModal(VMediaViewer, options)
}
