import { defineConfig } from 'vitest/config';

/** The eval harness (PRD §11.8): the golden set and the labelled safety set. */
export default defineConfig({
  test: {
    include: ['eval/**/*.test.ts'],
    // A miss in one profile is a finding, not a reason to stop: run them all.
    bail: 0,
  },
});
