import type { ApiError } from './api-error'

// What a query or mutation can tell the global error handler.
export interface RequestMeta {
  // false when the screen shows the error itself (inline under a form, for example).
  toast?: boolean
}

declare module '@pinia/colada' {
  interface TypesConfig {
    defaultError: ApiError
    queryMeta: RequestMeta
    mutationMeta: RequestMeta
  }
}

// The fallback text for an error nobody handled on the spot.
export function errorMessage(error: ApiError): string {
  if (error.status === 0) return 'No connection. Check your internet and try again.'
  if (error.status === 429) return 'Too many attempts. Please wait a few minutes and try again.'
  if (error.status === 413) return 'The file is too large.'
  return 'Something went wrong. Please try again.'
}

// Whether the global handler should show a toast for this error.
export function shouldToast(error: ApiError, meta: RequestMeta | undefined): boolean {
  if (meta?.toast === false || error.canceled) return false
  // 401 and 403 already send the user elsewhere (see installSessionInterceptor).
  return error.status !== 401 && error.status !== 403
}
