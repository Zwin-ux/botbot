import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      '@botbot/db': resolve(__dirname, '../../packages/db/src'),
      '@botbot/shared': resolve(__dirname, '../../packages/shared/src'),
      '@botbot/core': resolve(__dirname, '../../packages/core/src'),
    },
  },
});