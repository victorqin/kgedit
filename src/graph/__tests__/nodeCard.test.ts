import { describe, it, expect } from 'vitest'
import { escapeHtml } from '@/lib/escape'
import { buildNodeCard } from '../nodeCard'
import { ACCENT } from '@/theme/antdTheme'
import type { KgNode } from '@/api/types'

const node: KgNode = {
  id: 'n1',
  label: 'A101 System',
  type: 'Core Server',
  domain: 'Applications',
  desc: 'Frontend app tier',
}

describe('escapeHtml', () => {
  it.each([
    ['<script>', '&lt;script&gt;'],
    ['a & b', 'a &amp; b'],
    ['say "hi"', 'say &quot;hi&quot;'],
    ["it's", 'it&#39;s'],
  ])('escapes %s', (raw, expected) => {
    expect(escapeHtml(raw)).toBe(expected)
  })

  it('renders null and undefined as empty rather than the literal words', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })

  it('escapes ampersands before angle brackets so entities are not double-broken', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;')
  })
})

describe('buildNodeCard', () => {
  it('never emits an unescaped tag from node content — the card goes through innerHTML', () => {
    const evil = { ...node, label: '<img src=x onerror=alert(1)>' }
    const card = buildNodeCard(evil, 'L', false)
    expect(card).not.toContain('<img')
    expect(card).toContain('&lt;img')
  })

  it('escapes the description too', () => {
    const evil = { ...node, desc: '</div><script>alert(1)</script>' }
    expect(buildNodeCard(evil, 'L', false)).not.toContain('<script')
  })

  it('cannot be broken out of the id attribute to inject a handler', () => {
    // 字符串里出现 onclick= 是无害的 —— 关键是引号已被转义，攻击者无法跳出属性。
    // 所以这里真正解析一遍 DOM，断言没有多出任何属性。
    const evil = { ...node, id: 'a" onclick="alert(1)' }
    const root = new DOMParser()
      .parseFromString(buildNodeCard(evil, 'L', false), 'text/html')
      .body.firstElementChild!
    expect(root.getAttribute('onclick')).toBeNull()
    expect(root.getAttribute('data-node-id')).toBe('a" onclick="alert(1)')
  })

  it('cannot inject a sibling element through the label', () => {
    const evil = { ...node, label: '</div><img src=x onerror=alert(1)>' }
    const doc = new DOMParser().parseFromString(buildNodeCard(evil, 'L', false), 'text/html')
    expect(doc.querySelector('img')).toBeNull()
  })

  it('carries the node id so DOM level click handlers can resolve it', () => {
    expect(buildNodeCard(node, 'L', false)).toContain('data-node-id="n1"')
  })

  it('marks and stars the center node', () => {
    const card = buildNodeCard(node, 'L', true)
    expect(card).toContain('data-center="1"')
    expect(card).toContain('★')
  })

  it('does not star a non-center node', () => {
    expect(buildNodeCard(node, 'L', false)).not.toContain('★')
  })

  it('uses the side accent so the two panels stay visually distinct', () => {
    expect(buildNodeCard(node, 'L', true)).toContain(ACCENT.L)
    expect(buildNodeCard(node, 'R', true)).toContain(ACCENT.R)
  })

  it('falls back to an em dash for missing type and description', () => {
    const bare = { ...node, type: '', desc: '' }
    expect(buildNodeCard(bare, 'L', false)).toContain('—')
  })
})
