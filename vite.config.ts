import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  // 不做 manualChunks：把 antd 强行捏成一个块反而会让只有编辑页才用到的
  // Modal / Tree / AutoComplete 一并挤进首屏。交给 Rollup 按路由自然分包，
  // G6 由 useG6Graph 内的动态 import 天然落到独立块。
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', './e2e/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/test/**', 'src/main.tsx', 'src/mocks/browser.ts'],
      thresholds: { lines: 80, functions: 80, branches: 75 },
    },
  },
})
