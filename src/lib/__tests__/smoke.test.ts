import { describe, it, expect } from 'vitest'

describe('toolchain', () => {
  it('runs vitest in a jsdom environment', () => {
    expect(typeof document).toBe('object')
  })

  it('exposes the build-time api base url to tests', () => {
    expect(import.meta.env.VITE_API_BASE_URL).toBeTruthy()
  })
})
