import { describe, it, expect, beforeEach } from 'vitest'
import { createDb, DbError, type KgDb } from '../db'
import { ERR, type TreeResponse } from '@/api/types'

let db: KgDb
beforeEach(() => {
  db = createDb()
})

const leafIds = (r: TreeResponse) =>
  r.tree.flatMap((d) => d.children ?? []).flatMap((t) => t.children ?? []).map((n) => n.nodeId)

describe('neighborhood', () => {
  it('returns only the center when it has no edges', () => {
    const isolated = db.createNode({ label: 'Lonely', type: 'X', domain: 'D', desc: '' })
    const sub = db.neighborhood(isolated.id, 2)
    expect(sub.nodes.map((n) => n.id)).toEqual([isolated.id])
    expect(sub.edges).toEqual([])
  })

  it('expands exactly one hop at hops=1', () => {
    expect(db.neighborhood('a101', 1).nodes.map((n) => n.id).sort()).toEqual([
      'a101', 'appc', 'auth', 'cache', 'log1', 'log2',
    ])
  })

  it('grows monotonically with hop depth', () => {
    expect(db.neighborhood('a101', 2).nodes.length).toBeGreaterThan(
      db.neighborhood('a101', 1).nodes.length,
    )
  })

  it('traverses edges in both directions', () => {
    // dbb 只作为 target 被 gwd 指向，一跳仍应能回溯到 gwd
    expect(db.neighborhood('dbb', 1).nodes.map((n) => n.id)).toContain('gwd')
  })

  it('includes an edge only when both endpoints are inside the subgraph', () => {
    const sub = db.neighborhood('a101', 1)
    const ids = new Set(sub.nodes.map((n) => n.id))
    sub.edges.forEach((e) => {
      expect(ids.has(e.source)).toBe(true)
      expect(ids.has(e.target)).toBe(true)
    })
  })

  it('flags truncation and reports the untruncated size when over the cap', () => {
    const sub = db.neighborhood('a101', 9, 3)
    expect(sub.nodes).toHaveLength(3)
    expect(sub.meta.truncated).toBe(true)
    expect(sub.meta.totalNodes).toBeGreaterThan(3)
  })

  it('always keeps the center node when truncating', () => {
    expect(db.neighborhood('a101', 9, 1).nodes.map((n) => n.id)).toEqual(['a101'])
  })

  it('does not flag truncation when everything fits', () => {
    expect(db.neighborhood('a101', 1, 200).meta.truncated).toBe(false)
  })

  it('throws NOT_FOUND for an unknown center', () => {
    expect(() => db.neighborhood('nope', 2)).toThrow(DbError)
  })

  it('hands back copies so callers cannot mutate the store', () => {
    const sub = db.neighborhood('a101', 1)
    sub.nodes[0].label = 'MUTATED'
    expect(db.neighborhood('a101', 1).nodes[0].label).not.toBe('MUTATED')
  })
})

describe('tree', () => {
  it('groups domain then type then node', () => {
    const apps = db.tree('').tree.find((d) => d.label === 'APPLICATIONS')!
    expect(apps.children!.length).toBeGreaterThan(0)
    expect(apps.children![0].children![0].nodeId).toBeTruthy()
  })

  it('counts descendants at every domain level', () => {
    db.tree('').tree.forEach((d) => {
      expect(d.count).toBe(d.children!.reduce((a, t) => a + t.children!.length, 0))
    })
  })

  it.each(['database', 'Relational', 'Data Stores'])('matches against %s', (q) => {
    expect(leafIds(db.tree(q))).toContain('dbb')
  })

  it('is case insensitive', () => {
    expect(leafIds(db.tree('DATABASE'))).toContain('dbb')
  })

  it('caps an empty query by degree instead of returning everything', () => {
    for (let i = 0; i < 80; i++) {
      db.createNode({ label: `N${i}`, type: 'Bulk', domain: 'Bulk', desc: '' })
    }
    expect(db.tree('', 50).total).toBeLessThanOrEqual(50)
  })

  it('returns an empty tree when nothing matches', () => {
    expect(db.tree('zzzzz').tree).toEqual([])
  })

  it('clips long descriptions for the right-hand meta column', () => {
    const long = db.createNode({ label: 'Verbose', type: 'T', domain: 'D', desc: 'x'.repeat(60) })
    const leaf = db.tree('Verbose').tree[0].children![0].children![0]
    expect(leaf.nodeId).toBe(long.id)
    expect(leaf.meta!.length).toBeLessThanOrEqual(22)
  })
})

describe('path', () => {
  it('finds a route, with no edge on the first segment', () => {
    const p = db.path('a101', 'dbb')
    expect(p.found).toBe(true)
    expect(p.segments[0].node.id).toBe('a101')
    expect(p.segments[0].edge).toBeUndefined()
    expect(p.segments.at(-1)!.node.id).toBe('dbb')
  })

  it('marks forward segments as not reversed', () => {
    expect(db.path('a101', 'dbb').segments.slice(1).every((s) => s.edge!.reversed === false)).toBe(true)
  })

  it('marks a segment reversed when traversed against the edge direction', () => {
    // dbb -> a101 必须逆着 gwd->dbb 等边走
    const p = db.path('dbb', 'a101')
    expect(p.found).toBe(true)
    expect(p.segments.some((s) => s.edge?.reversed)).toBe(true)
  })

  it('reports not found for disconnected nodes', () => {
    const lonely = db.createNode({ label: 'Island', type: 'X', domain: 'D', desc: '' })
    expect(db.path('a101', lonely.id).found).toBe(false)
  })

  it('returns a single segment when from equals to', () => {
    expect(db.path('a101', 'a101').segments).toHaveLength(1)
  })

  it('lists every existing relation between the two endpoints in directLinks', () => {
    db.createLink({ source: 'a101', target: 'dbb', label: 'audits' })
    db.createLink({ source: 'dbb', target: 'a101', label: 'notifies' })
    expect(db.path('a101', 'dbb').directLinks).toHaveLength(2)
  })

  it('reports directLinks even when one endpoint is unknown', () => {
    expect(db.path('a101', 'nope').found).toBe(false)
  })
})

describe('link constraints', () => {
  it('rejects a self loop', () => {
    expect(() => db.createLink({ source: 'a101', target: 'a101', label: 'loops' })).toThrow(
      expect.objectContaining({ code: ERR.SELF_LOOP }),
    )
  })

  it('allows parallel relations with different predicates', () => {
    db.createLink({ source: 'appc', target: 'dbb', label: 'reads' })
    expect(() => db.createLink({ source: 'appc', target: 'dbb', label: 'writes' })).not.toThrow()
  })

  it('rejects a duplicate source+target+predicate', () => {
    db.createLink({ source: 'appc', target: 'dbb', label: 'reads' })
    expect(() => db.createLink({ source: 'appc', target: 'dbb', label: 'reads' })).toThrow(
      expect.objectContaining({ code: ERR.DUPLICATE }),
    )
  })

  it('treats direction as significant — the mirror of an existing edge is allowed', () => {
    db.createLink({ source: 'appc', target: 'dbb', label: 'reads' })
    expect(() => db.createLink({ source: 'dbb', target: 'appc', label: 'reads' })).not.toThrow()
  })

  it('rejects a link to a node that does not exist', () => {
    expect(() => db.createLink({ source: 'a101', target: 'nope', label: 'x' })).toThrow(
      expect.objectContaining({ code: ERR.NOT_FOUND }),
    )
  })
})

describe('reverseLink', () => {
  it('swaps source and target', () => {
    const before = db.link('e8')
    const after = db.reverseLink('e8')
    expect(after.source.id).toBe(before.target.id)
    expect(after.target.id).toBe(before.source.id)
  })

  it('keeps the same id so the current selection survives', () => {
    expect(db.reverseLink('e8').id).toBe('e8')
  })

  it('refuses when the reversed form would duplicate an existing relation', () => {
    const e = db.link('e8')
    db.createLink({ source: e.target.id, target: e.source.id, label: e.label })
    expect(() => db.reverseLink('e8')).toThrow(expect.objectContaining({ code: ERR.DUPLICATE }))
  })
})

describe('deleteNode', () => {
  it('removes the node and reports every relation it took with it', () => {
    const before = db.nodeLinks('dbb').map((l) => l.id).sort()
    const res = db.deleteNode('dbb')
    expect(res.deletedNodeId).toBe('dbb')
    expect(res.deletedLinkIds.sort()).toEqual(before)
    expect(db.stats().nodeCount).toBe(13)
  })

  it('leaves no dangling edges behind', () => {
    db.deleteNode('dbb')
    const all = db.neighborhood('a101', 9).edges
    expect(all.some((e) => e.source === 'dbb' || e.target === 'dbb')).toBe(false)
  })
})

describe('taxonomy', () => {
  it('lists distinct domains and types for the editor dropdowns', () => {
    const t = db.taxonomy()
    expect(t.domains).toContain('Data Stores')
    expect(t.types).toContain('Relational DB')
    expect(new Set(t.domains).size).toBe(t.domains.length)
  })

  it('picks up a domain introduced by a newly created node', () => {
    db.createNode({ label: 'Q', type: 'Kafka Topic', domain: 'Streaming', desc: '' })
    expect(db.taxonomy().domains).toContain('Streaming')
  })
})

describe('stats', () => {
  it('reports the seeded graph size', () => {
    expect(db.stats()).toEqual({ nodeCount: 14, linkCount: 15 })
  })
})
