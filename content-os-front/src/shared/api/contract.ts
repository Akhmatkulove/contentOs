import type { components } from './schema'

// Request and response shapes of the backend, generated from its OpenAPI schema.
// Don't edit schema.d.ts by hand: run `npm run gen:api` after the backend changes.
export type Schemas = components['schemas']
