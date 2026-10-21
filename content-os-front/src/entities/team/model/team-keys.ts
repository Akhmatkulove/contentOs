// Cache keys of the art director's team (docs/adr/0002).
export const teamKeys = {
  all: ['team'] as const,
  // Creators an admin linked to the art director.
  creators: ['team', 'creators'] as const,
}
