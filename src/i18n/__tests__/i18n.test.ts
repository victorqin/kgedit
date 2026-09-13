import { describe, it, expect } from 'vitest'
import i18n, { antdLocaleFor, SUPPORTED_LNGS } from '../index'
import enUS from '@/locales/en-US.json'
import zhCN from '@/locales/zh-CN.json'
import zhTW from '@/locales/zh-TW.json'

const keysOf = (o: object, prefix = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? keysOf(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  )

describe('i18n', () => {
  it('defaults to en-US', () => {
    expect(i18n.resolvedLanguage).toBe('en-US')
  })

  it('keeps the design canvas copy verbatim in the en pack', () => {
    expect(i18n.t('picker.startPlaceholder')).toBe('Start node — click to browse')
    expect(i18n.t('panel.startTitle')).toBe('START-CENTRIC SUBGRAPH')
  })

  it('interpolates counts into the stats line', () => {
    expect(i18n.t('app.stats', { nodes: 14, links: 15 })).toBe('14 NODES · 15 RELATIONS')
  })

  it('has identical key sets across all locales', () => {
    const base = keysOf(enUS).sort()
    expect(keysOf(zhCN).sort()).toEqual(base)
    expect(keysOf(zhTW).sort()).toEqual(base)
  })

  it('lists exactly the three supported locales', () => {
    expect([...SUPPORTED_LNGS]).toEqual(['en-US', 'zh-CN', 'zh-TW'])
  })

  it('maps each locale to an antd locale pack', () => {
    expect(antdLocaleFor('zh-CN').locale).toBe('zh-cn')
    expect(antdLocaleFor('zh-TW').locale).toBe('zh-tw')
    expect(antdLocaleFor('en-US').locale).toBe('en')
  })

  it('falls back to the english antd pack for an unknown locale', () => {
    expect(antdLocaleFor('fr-FR').locale).toBe('en')
  })
})
