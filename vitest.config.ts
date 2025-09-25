import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/**/*.bench.ts'],
    exclude: ['node_modules', 'dist'],
  },
});
