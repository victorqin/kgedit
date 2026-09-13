import { describe, it, expect } from 'vitest'
import {
  buildGraphOptions,
  isMiddleButtonDrag,
  MOUSE_BUTTONS,
  SIMPLIFY_THRESHOLD,
  toG6Data,
} from '../graphOptions'
import type { GraphPayload } from '@/api/types'

const payload: GraphPayload = {
  nodes: [
    { id: 'a', label: 'A', type: 'T', domain: 'D', desc: '' },
    { id: 'b', label: 'B', type: 'T', domain: 'D', desc: '' },
  ],
  edges: [{ id: 'e1', source: 'a', target: 'b', label: 'reads', predicate: 'reads', directed: true }],
  meta: { centerId: 'a', hops: 2, truncated: false, nodeCap: 200, totalNodes: 2 },
}

describe('buildGraphOptions', () => {
  it('uses quadratic edges so parallel relations do not overlap', () => {
    expect(buildGraphOptions({ side: 'L', simplified: false }).edge?.type).toBe('quadratic')
  })

  it('uses html nodes below the simplify threshold', () => {
    expect(buildGraphOptions({ side: 'L', simplified: false }).node?.type).toBe('html')
  })

  it('degrades to a cheap node type above the threshold', () => {
    expect(buildGraphOptions({ side: 'L', simplified: true }).node?.type).toBe('circle')
  })

  it('keeps the design canvas force parameters', () => {
    const { layout } = buildGraphOptions({ side: 'L', simplified: false })
    expect(layout.link.distance).toBe(260)
    expect(layout.manyBody.strength).toBe(-520)
    expect(layout.collide.radius).toBe(118)
  })

  it('sets a threshold that keeps html cards off very large graphs', () => {
    expect(SIMPLIFY_THRESHOLD).toBeLessThanOrEqual(200)
  })

  it('keeps zoom on the wheel, ungated by any button', () => {
    expect(buildGraphOptions({ side: 'L', simplified: false }).behaviors).toContain('zoom-canvas')
  })
})

describe('isMiddleButtonDrag', () => {
  it('allows a drag while the middle button is held', () => {
    expect(isMiddleButtonDrag({ buttons: MOUSE_BUTTONS.MIDDLE })).toBe(true)
  })

  it('refuses the left button so it stays a pure selection gesture', () => {
    expect(isMiddleButtonDrag({ buttons: MOUSE_BUTTONS.LEFT })).toBe(false)
  })

  it('refuses the right button, which opens the editor instead', () => {
    expect(isMiddleButtonDrag({ buttons: MOUSE_BUTTONS.RIGHT })).toBe(false)
  })

  it('refuses when no button is held at all', () => {
    // 这是关键的一条：编辑弹窗关闭后 G6 会补发一次 dragstart，
    // 那一刻 buttons 为 0，必须拒绝，否则节点会跟着鼠标跑。
    expect(isMiddleButtonDrag({ buttons: 0 })).toBe(false)
  })

  it('refuses when buttons is absent rather than defaulting to allow', () => {
    expect(isMiddleButtonDrag({})).toBe(false)
  })
})

describe('behaviors', () => {
  it('gates both canvas panning and node dragging on the same predicate', () => {
    const { behaviors } = buildGraphOptions({ side: 'L', simplified: false })
    const gated = behaviors.filter(
      (b): b is { type: string; enable: typeof isMiddleButtonDrag } =>
        typeof b === 'object' && 'enable' in b,
    )
    expect(gated.map((b) => b.type).sort()).toEqual(['drag-canvas', 'drag-element'])
    gated.forEach((b) => expect(b.enable).toBe(isMiddleButtonDrag))
  })
})

describe('toG6Data', () => {
  it('marks the center node so the card renderer can highlight it', () => {
    const data = toG6Data(payload)
    expect(data.nodes.find((n) => n.id === 'a')?.data?.center).toBe(true)
    expect(data.nodes.find((n) => n.id === 'b')?.data?.center).toBe(false)
  })

  it('preserves edge ids so selection and mutation can address them', () => {
    expect(toG6Data(payload).edges[0].id).toBe('e1')
  })

  it('carries the edge label through for rendering', () => {
    expect(toG6Data(payload).edges[0].data?.label).toBe('reads')
  })

  it('returns empty collections for a null payload', () => {
    expect(toG6Data(null)).toEqual({ nodes: [], edges: [] })
  })
})
