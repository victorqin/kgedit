import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  build: {
    rollupOptions: {
      output: {
        // G6 与 antd 各自成块，避免挤进首屏主包
        manualChunks(id: string) {
          if (id.includes('@antv/g6')) return 'g6'
          if (id.includes('node_modules/antd') || id.includes('@ant-design')) return 'antd'
          return undefined
        },
      },
    },
  },
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
