import { defineConfig } from 'vitest/config';

/** The unit tests. The eval (`pnpm test:eval`) has its own config beside this one. */
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
});
