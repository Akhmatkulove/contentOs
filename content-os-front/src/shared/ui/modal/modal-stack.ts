import {
  markRaw,
  shallowReactive,
  type AllowedComponentProps,
  type Component,
  type ComputedRef,
  type InjectionKey,
  type VNodeProps,
} from 'vue'

// Modals are opened from code, like toasts: openModal(AddReferenceModal, props)
// returns a promise of what the modal closed with. VModalHost (App.vue) renders
// them, so pages carry neither modal markup nor open flags.

export interface ModalEntry {
  id: number
  component: Component
  props: Record<string, unknown>
  open: boolean
  resolve: (result: unknown) => void
}

// Given to VModal by the host, one per open modal.
export interface ModalContext {
  open: ComputedRef<boolean>
  dismiss: () => void
}

export const modalContextKey: InjectionKey<ModalContext> = Symbol('modal')

// Long enough for the exit animation (300ms) before the modal unmounts.
const REMOVE_DELAY_MS = 400

let nextId = 0

export const modals = shallowReactive<ModalEntry[]>([])

/* eslint-disable @typescript-eslint/no-explicit-any -- matching any component shape */
type PropsOf<C> = C extends new (...args: any) => { $props: infer P } ? P : never

// What the modal passes to emit('close', result); undefined when dismissed.
export type ModalResult<C> =
  PropsOf<C> extends { onClose?: (...args: infer A) => any } ? A[0] : undefined
/* eslint-enable @typescript-eslint/no-explicit-any */

type OpenProps<C> = Omit<PropsOf<C>, 'onClose' | keyof VNodeProps | keyof AllowedComponentProps>

// The component's root is VModal; it emits close(result?) to finish. Pass a
// defineAsyncComponent() to load the modal's code only when it opens.
export function openModal<C extends Component>(
  component: C,
  ...[props]: Record<string, never> extends OpenProps<C>
    ? [props?: OpenProps<C>]
    : [props: OpenProps<C>]
): Promise<ModalResult<C> | undefined> {
  return new Promise((resolve) => {
    modals.push({
      id: nextId++,
      component: markRaw(component),
      props: (props ?? {}) as Record<string, unknown>,
      open: true,
      resolve: resolve as (result: unknown) => void,
    })
  })
}

export function closeModal(id: number, result?: unknown) {
  const index = modals.findIndex((entry) => entry.id === id)
  if (index === -1 || !modals[index]!.open) return
  const entry = modals[index]!
  entry.resolve(result)
  modals.splice(index, 1, { ...entry, open: false })
  setTimeout(() => {
    const at = modals.findIndex((item) => item.id === id)
    if (at !== -1) modals.splice(at, 1)
  }, REMOVE_DELAY_MS)
}

// On navigation: a modal belongs to the screen that opened it.
export function closeAllModals() {
  for (const entry of [...modals]) closeModal(entry.id)
}
