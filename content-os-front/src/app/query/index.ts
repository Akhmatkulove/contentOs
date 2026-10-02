import { PiniaColada, PiniaColadaQueryHooksPlugin, type PiniaColadaOptions } from '@pinia/colada'
import type { App } from 'vue'
import { errorMessage, shouldToast, toApiError, type RequestMeta } from '@/shared/api'
import { toast } from '@/shared/ui/toast'

// One place that turns an unhandled request failure into a toast.
// A screen that shows the error itself opts out with `meta: { toast: false }`.
function reportError(error: unknown, meta: RequestMeta | undefined) {
  const apiError = toApiError(error)
  if (shouldToast(apiError, meta)) toast.error(errorMessage(apiError))
}

export const queryOptions: PiniaColadaOptions = {
  queryOptions: {
    // Most data here changes when someone else acts on it, not every second.
    staleTime: 30_000,
  },
  mutationOptions: {
    onError: (error, _vars, { entry }) => reportError(error, entry.meta),
  },
  plugins: [
    PiniaColadaQueryHooksPlugin({
      onError: (error, entry) => reportError(error, entry.meta),
    }),
  ],
}

export function installQuery(app: App) {
  app.use(PiniaColada, queryOptions)
}
