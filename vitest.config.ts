import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Unit tests only - exclude integration tests per TESTING.md
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/', '**/*.integration.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        'scripts/',
        'src/scripts/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '.next/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
