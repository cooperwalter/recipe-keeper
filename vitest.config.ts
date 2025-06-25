import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react({ 
    jsxRuntime: 'automatic',
    babel: {
      plugins: [],
    }
  })],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./test/vitest.setup.ts', './test/setup.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**', '.idea', '.git', '.cache', '**/e2e/**'],
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      ANTHROPIC_API_KEY: 'test-api-key',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})