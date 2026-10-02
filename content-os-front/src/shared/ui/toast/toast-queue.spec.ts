import { dismiss, toast, toasts } from './toast-queue'

const openTitles = () => toasts.filter((item) => item.open).map((item) => item.title)

describe('toast queue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    toasts.splice(0)
  })
  afterEach(() => vi.useRealTimers())

  it('shows a toast and removes it after closing', () => {
    toast.error('Offline')
    expect(openTitles()).toEqual(['Offline'])

    dismiss(toasts[0]!.id)
    expect(openTitles()).toEqual([])
    vi.runAllTimers()
    expect(toasts).toHaveLength(0)
  })

  it('does not repeat a toast that is already on screen', () => {
    toast.error('Offline')
    toast.error('Offline')

    expect(openTitles()).toEqual(['Offline'])
  })

  it('keeps at most three on screen, closing the oldest', () => {
    for (const title of ['1', '2', '3', '4']) toast.error(title)

    expect(openTitles()).toEqual(['2', '3', '4'])
  })
})
