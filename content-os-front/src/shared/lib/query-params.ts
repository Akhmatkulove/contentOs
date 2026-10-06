import { computed, shallowRef } from 'vue'
import { useRoute, useRouter, type LocationQuery, type LocationQueryRaw } from 'vue-router'

// One URL query parameter: its default and how to read it back. `parse` returns
// undefined for a value it doesn't accept (a hand-edited ?sort=price), and the
// default is used instead.
export interface QueryParam<T> {
  default: T
  parse: (raw: string) => T | undefined
  // Name in the URL when it differs from the field: productId → ?product=.
  param?: string
}

export type QueryParams = Record<string, QueryParam<string> | QueryParam<number>>
export type QueryValues<D extends QueryParams> = {
  [K in keyof D]: D[K] extends QueryParam<infer T> ? T : never
}

export const queryParam = {
  // Free text: search, a collection name.
  text: (fallback = '', param?: string): QueryParam<string> => ({
    default: fallback,
    parse: (raw) => raw,
    param,
  }),
  // One of a fixed set: tabs, statuses, sort orders.
  oneOf: <const T extends string>(
    values: readonly T[],
    fallback: NoInfer<T>,
    param?: string,
  ): QueryParam<T> => ({
    default: fallback,
    parse: (raw) => ((values as readonly string[]).includes(raw) ? (raw as T) : undefined),
    param,
  }),
  // A page number: a whole number from 1.
  page: (): QueryParam<number> => ({
    default: 1,
    parse: (raw) => {
      const page = Number(raw)
      return Number.isInteger(page) && page >= 1 ? page : undefined
    },
  }),
}

const nameOf = (defs: QueryParams, key: string) => defs[key]!.param ?? key

// The values in the query, each checked; anything missing or invalid is its default.
export function readQuery<D extends QueryParams>(query: LocationQuery, defs: D): QueryValues<D> {
  const values: Record<string, unknown> = {}
  for (const [key, def] of Object.entries(defs)) {
    const raw = query[nameOf(defs, key)]
    values[key] = (typeof raw === 'string' ? def.parse(raw) : undefined) ?? def.default
  }
  return values as QueryValues<D>
}

// The query with the patch applied. Defaults are left out, so a page without
// filters keeps a clean URL; parameters the defs don't know stay as they are.
export function writeQuery<D extends QueryParams>(
  query: LocationQuery,
  defs: D,
  patch: Partial<QueryValues<D>>,
): LocationQueryRaw {
  const next: LocationQueryRaw = { ...query }
  for (const [key, value] of Object.entries(patch)) {
    const def = defs[key]
    if (!def) continue
    const name = nameOf(defs, key)
    if (value === def.default || value === '' || value === undefined) delete next[name]
    else next[name] = String(value)
  }
  return next
}

// State of a list screen kept in the URL: search, filters, sort, tab, page.
// Links, reload, Back and a new tab all open the same list.
//
// `state` is read and written like a plain object (v-model="state.sort").
// Writes go out as one router.replace per tick: no history entry per keystroke,
// and changing several fields at once is one navigation and one request.
// With `page`, changing anything else returns to the first page in that same
// navigation.
export function useQueryParams<D extends QueryParams>(
  defs: D,
  options: { page?: keyof D & string } = {},
) {
  const route = useRoute()
  const router = useRouter()

  // Written but not yet in the URL: read first, so the new values show at once.
  const pending = shallowRef<Partial<QueryValues<D>> | null>(null)
  let scheduled = false
  const values = computed(() => ({ ...readQuery(route.query, defs), ...pending.value }))

  async function flush() {
    scheduled = false
    const patch = pending.value
    if (!patch) return
    await router.replace({ query: writeQuery(route.query, defs, patch), hash: route.hash })
    // Newer writes during the navigation stay pending for their own flush.
    if (pending.value === patch) pending.value = null
  }

  function update(patch: Partial<QueryValues<D>>) {
    const changed = Object.entries(patch).some(
      ([key, value]) => values.value[key as keyof D] !== value,
    )
    if (!changed) return
    const { page } = options
    const next: Partial<QueryValues<D>> = { ...patch }
    if (page && !(page in patch)) {
      next[page] = defs[page]!.default as QueryValues<D>[typeof page]
    }
    pending.value = { ...pending.value, ...next }
    if (!scheduled) {
      scheduled = true
      queueMicrotask(() => void flush())
    }
  }

  const state = {} as QueryValues<D>
  for (const key of Object.keys(defs) as (keyof D & string)[]) {
    Object.defineProperty(state, key, {
      enumerable: true,
      get: () => values.value[key],
      set: (value: QueryValues<D>[typeof key]) =>
        update({ [key]: value } as Partial<QueryValues<D>>),
    })
  }

  // Back to the defaults for these fields, in one update: "Clear filters".
  function reset(keys: readonly (keyof D & string)[]) {
    update(
      Object.fromEntries(keys.map((key) => [key, defs[key]!.default])) as Partial<QueryValues<D>>,
    )
  }

  return { state, update, reset }
}
