import { describe, it, expect } from 'vitest'
import { kgTheme, ACCENT, SIDE_BORDER } from '../antdTheme'

describe('kgTheme', () => {
  it('uses the design canvas ground and accent colours', () => {
    expect(kgTheme.token?.colorBgBase).toBe('#0b0f15')
    expect(kgTheme.token?.colorPrimary).toBe('#4ade80')
  })

  it('sets IBM Plex Sans as the base family', () => {
    expect(kgTheme.token?.fontFamily).toContain('IBM Plex Sans')
  })

  it('applies the dark algorithm so antd surfaces match the dark ground', () => {
    expect(kgTheme.algorithm).toBeDefined()
  })
})

describe('ACCENT', () => {
  it('exposes per-side accents matching the two panels', () => {
    expect(ACCENT.L).toBe('#4ade80')
    expect(ACCENT.R).toBe('#60a5fa')
  })

  it('pairs each side with its panel border colour', () => {
    expect(SIDE_BORDER.L).toBe('#2f6b45')
    expect(SIDE_BORDER.R).toBe('#2d5680')
  })
})
