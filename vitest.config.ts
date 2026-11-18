import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Las pruebas de integración hablan con Turso: la latencia manda.
    testTimeout: 60_000,
    hookTimeout: 30_000,
    include: ['**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
  },
});
