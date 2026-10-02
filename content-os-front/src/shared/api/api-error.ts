import axios from 'axios'

// Every failed request ends up as one of these, whatever went wrong underneath.
export class ApiError extends Error {
  constructor(
    // HTTP status; 0 when no answer came back (offline, timeout, CORS, cancelled).
    readonly status: number,
    message: string,
    // Per-field messages from a 422, keyed by the field name the backend used.
    readonly fields: Record<string, string> = {},
    // The request was aborted on purpose: not an error anyone should see.
    readonly canceled = false,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'ApiError'
  }
}

// FastAPI answers {detail: "..."} or, for validation, {detail: [{loc, msg}]}.
type Detail = string | { loc?: (string | number)[]; msg?: string }[]

function fieldsOf(detail: Detail | undefined): Record<string, string> {
  if (!Array.isArray(detail)) return {}
  const fields: Record<string, string> = {}
  for (const item of detail) {
    const field = item.loc?.at(-1)
    if (field !== undefined && item.msg && !(field in fields)) fields[field] = item.msg
  }
  return fields
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (!axios.isAxiosError(error)) {
    return new ApiError(0, error instanceof Error ? error.message : String(error), {}, false, {
      cause: error,
    })
  }
  const detail = (error.response?.data as { detail?: Detail } | undefined)?.detail
  return new ApiError(
    error.response?.status ?? 0,
    typeof detail === 'string' ? detail : error.message,
    fieldsOf(detail),
    axios.isCancel(error),
    { cause: error },
  )
}

// HTTP status of a failed request, or undefined when no answer came back.
export function errorStatus(error: unknown): number | undefined {
  return toApiError(error).status || undefined
}
