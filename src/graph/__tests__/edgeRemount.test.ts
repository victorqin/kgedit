import { describe, it, expect } from 'vitest'
import { Graph as GraphLib } from '@antv/graphlib'
import { findRewiredEdgeIds } from '../edgeRemount'
import type { G6Data } from '../graphOptions'

const data = (edges: { id: string; source: string; target: string }[]): G6Data => ({
  nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
  edges,
})

describe('findRewiredEdgeIds', () => {
  it('flags an edge whose endpoints were swapped', () => {
    const prev = data([{ id: 'e1', source: 'a', target: 'b' }])
    const next = data([{ id: 'e1', source: 'b', target: 'a' }])
    expect(findRewiredEdgeIds(prev, next)).toEqual(['e1'])
  })

  it('flags an edge that was re-pointed at one end only', () => {
    const prev = data([{ id: 'e1', source: 'a', target: 'b' }])
    const next = data([{ id: 'e1', source: 'a', target: 'c' }])
    expect(findRewiredEdgeIds(prev, next)).toEqual(['e1'])
  })

  it('leaves an unchanged edge alone so a label edit stays an in-place update', () => {
    const prev = data([{ id: 'e1', source: 'a', target: 'b' }])
    const next = data([{ id: 'e1', source: 'a', target: 'b' }])
    expect(findRewiredEdgeIds(prev, next)).toEqual([])
  })

  it('ignores edges that are brand new — they are added, not updated', () => {
    const prev = data([])
    const next = data([{ id: 'e1', source: 'a', target: 'b' }])
    expect(findRewiredEdgeIds(prev, next)).toEqual([])
  })

  it('ignores edges that disappeared', () => {
    const prev = data([{ id: 'e1', source: 'a', target: 'b' }])
    expect(findRewiredEdgeIds(prev, data([]))).toEqual([])
  })

  it('returns nothing when there is no previous snapshot at all', () => {
    expect(findRewiredEdgeIds(null, data([{ id: 'e1', source: 'a', target: 'b' }]))).toEqual([])
  })

  it('does not confuse a swap with an identically shaped parallel edge', () => {
    const prev = data([
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'a', target: 'b' },
    ])
    const next = data([
      { id: 'e1', source: 'b', target: 'a' },
      { id: 'e2', source: 'a', target: 'b' },
    ])
    expect(findRewiredEdgeIds(prev, next)).toEqual(['e1'])
  })
})

/**
 * 这一组测的是上面那个兜底存在的理由，直接打在 graphlib 上。
 * 它同时是一个探针：上游哪天修好了，第一条会失败，那时兜底就能删掉。
 */
describe('graphlib 的端点索引在反转时会漏掉一端', () => {
  const seed = () =>
    new GraphLib<{ x?: number }, Record<string, never>>({
      nodes: [
        { id: 'a', data: {} },
        { id: 'b', data: {} },
      ],
      edges: [{ id: 'e1', source: 'a', target: 'b', data: {} }],
    })

  const related = (g: ReturnType<typeof seed>, id: string) =>
    g.getRelatedEdges(id, 'both').map((e) => String(e.id))

  it('就地换端点后，新起点丢掉了这条边', () => {
    const g = seed()
    // G6 的 updateEdgeData 对反转就是这两步，顺序一致
    g.updateEdgeSource('e1', 'b')
    g.updateEdgeTarget('e1', 'a')

    expect(related(g, 'a')).toEqual(['e1'])
    expect(
      related(g, 'b'),
      '上游已修复：src/graph/edgeRemount.ts 里的兜底可以删掉了',
    ).toEqual([])
  })

  it('删掉再重新加进去，两端就都认得这条边', () => {
    const g = seed()
    g.removeEdge('e1')
    g.addEdge({ id: 'e1', source: 'b', target: 'a', data: {} })

    expect(related(g, 'a')).toEqual(['e1'])
    expect(related(g, 'b')).toEqual(['e1'])
  })
})
