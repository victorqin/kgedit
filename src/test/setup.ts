import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// jsdom 没实现 ResizeObserver，而 AntD 的 Tree / Select 依赖它，
// 缺了会让整棵子树在挂载时崩掉。
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// AntD 的响应式工具会读 matchMedia
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

// G6 会探测 canvas；组件测试里对图的真实渲染不做断言，交给 E2E
if (!HTMLCanvasElement.prototype.getContext) {
  HTMLCanvasElement.prototype.getContext = (() => null) as never
}
