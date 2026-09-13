import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // 三个浏览器同时跑力导向布局会把 CPU 吃满，导致渲染超时的假失败。
  // 限制并发比无脑加 timeout 更接近真实原因。
  workers: 2,
  forbidOnly: !!process.env.CI,
  // 力导向布局很吃 CPU，并发下图渲染的等待偶发超时；这类用例单独跑都稳定通过。
  // 真实缺陷在重试后依然会失败。
  retries: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 45_000,
  expect: { timeout: 10_000, toHaveScreenshot: { maxDiffPixelRatio: 0.02 } },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // 本项目只面向 Chrome，不跑 Firefox / WebKit
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // mock 模式下构建并预览：E2E 跑的是真实产物 + MSW，不依赖任何后端
  webServer: {
    command: `npx vite build --mode development && npx vite preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
