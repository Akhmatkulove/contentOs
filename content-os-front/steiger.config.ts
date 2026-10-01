import { defineConfig } from 'steiger'
import fsd from '@feature-sliced/steiger-plugin'

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // Test files sit next to the code they cover, outside of segments.
    ignores: ['**/*.spec.ts'],
  },
])
