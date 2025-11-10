import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/dist/**',
        '**/node_modules/**',
        '**/.kiro/**',
        '**/adapters/**',
        '**/docker/**',
        '**/*.config.ts',
        '**/*.config.js'
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70
      }
    },
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/adapters/**'],
    env: {
      AE_HMAC_SECRET: 'test-hmac-secret',
      DATA_DIR: './test-data',
      LLM_PROXY_URL: 'http://localhost:3001',
      PORT: '3000'
    }
  }
});
