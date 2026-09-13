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

// jsdom 不实现 canvas。返回 null 会让期待 context 的调用方直接炸，
// 所以给一个最小可用的桩；图的真实渲染由 E2E 覆盖。
const stubContext = () =>
  new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === 'canvas') return document.createElement('canvas')
        if (prop === 'measureText') return () => ({ width: 0 })
        if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) })
        return () => undefined
      },
    },
  )

HTMLCanvasElement.prototype.getContext = stubContext as never
