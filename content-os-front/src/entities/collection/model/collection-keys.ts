// Cache keys of collections. Saving a product or a reference may create one, so
// those saves invalidate `all`.
export const collectionKeys = {
  all: ['collections'] as const,
  // The Collection field's suggestions.
  list: ['collections', 'list'] as const,
}
