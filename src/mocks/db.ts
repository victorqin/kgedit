import type {
  DeleteLinkResult,
  DeleteNodeResult,
  GraphPayload,
  KgEdge,
  KgNode,
  LinkDetail,
  LinkInput,
  NodeInput,
  PathResponse,
  PathSegment,
  Stats,
  Taxonomy,
  TreeNode,
  TreeResponse,
} from '@/api/types'
import { ERR } from '@/api/types'
import { SEED_EDGES, SEED_NODES } from './seed'

export class DbError extends Error {
  constructor(
    public readonly code: number,
    message: string,
  ) {
    super(message)
    this.name = 'DbError'
  }
}

/** 服务端一次最多返回的节点数。超出则截断并置 meta.truncated。 */
export const DEFAULT_NODE_CAP = 200
/** 树叶子右侧 meta 列的截断长度 */
const META_CLIP = 22

const clone = <T>(v: T): T => structuredClone(v)

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/**
 * 内存图数据库。全部是纯逻辑，不依赖 MSW，可直接单测。
 * 每个读方法都返回深拷贝，调用方改不到内部状态。
 */
export function createDb(
  seedNodes: KgNode[] = SEED_NODES,
  seedEdges: KgEdge[] = SEED_EDGES,
) {
  let nodes: KgNode[] = clone(seedNodes)
  let edges: KgEdge[] = clone(seedEdges)
  let seq = seedEdges.length

  const nodeOf = (id: string) => nodes.find((n) => n.id === id)

  const mustNode = (id: string): KgNode => {
    const n = nodeOf(id)
    if (!n) throw new DbError(ERR.NOT_FOUND, `Node ${id} not found`)
    return n
  }

  const mustEdge = (id: string): KgEdge => {
    const e = edges.find((x) => x.id === id)
    if (!e) throw new DbError(ERR.NOT_FOUND, `Link ${id} not found`)
    return e
  }

  const degreeOf = (id: string) => edges.filter((e) => e.source === id || e.target === id).length

  const endpoint = (id: string) => ({ id, label: nodeOf(id)?.label ?? id })

  const detail = (e: KgEdge): LinkDetail => ({
    id: e.id,
    source: endpoint(e.source),
    target: endpoint(e.target),
    label: e.label,
    predicate: e.predicate,
    directed: true,
    props: e.props,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  })

  const nextId = (prefix: string) => `${prefix}${Date.now().toString(36)}${seq++}`

  /** 无向 BFS 分层展开；超出 cap 时按发现顺序截断，中心节点永远保留。 */
  function neighborhood(centerId: string, hops: number, cap = DEFAULT_NODE_CAP): GraphPayload {
    mustNode(centerId)
    const seen = new Set([centerId])
    const ordered = [centerId]
    let frontier = [centerId]

    for (let h = 0; h < hops; h++) {
      const next: string[] = []
      for (const id of frontier) {
        for (const e of edges) {
          const nb = e.source === id ? e.target : e.target === id ? e.source : null
          if (!nb || seen.has(nb)) continue
          seen.add(nb)
          ordered.push(nb)
          next.push(nb)
        }
      }
      if (!next.length) break
      frontier = next
    }

    const kept = ordered.slice(0, Math.max(1, cap))
    const keptSet = new Set(kept)
    return {
      nodes: kept.map((id) => clone(mustNode(id))),
      edges: clone(edges.filter((e) => keptSet.has(e.source) && keptSet.has(e.target))),
      meta: {
        centerId,
        hops,
        truncated: ordered.length > kept.length,
        nodeCap: cap,
        totalNodes: ordered.length,
      },
    }
  }

  /** 域 ▸ 类型 ▸ 节点 三层分组在服务端完成，前端不再自己算。 */
  function tree(q: string, limit = 50): TreeResponse {
    const needle = q.trim().toLowerCase()
    const list = needle
      ? nodes.filter(
          (n) =>
            n.label.toLowerCase().includes(needle) ||
            n.type.toLowerCase().includes(needle) ||
            n.domain.toLowerCase().includes(needle),
        )
      : // 空查询不返回全量，按度数取 Top N —— 真实图谱可能有上万节点
        [...nodes].sort((a, b) => degreeOf(b.id) - degreeOf(a.id)).slice(0, limit)

    const byDomain = new Map<string, Map<string, KgNode[]>>()
    for (const n of list) {
      const d = n.domain || 'Uncategorized'
      const t = n.type || '(no type)'
      if (!byDomain.has(d)) byDomain.set(d, new Map())
      const types = byDomain.get(d)!
      types.set(t, [...(types.get(t) ?? []), n])
    }

    const out: TreeNode[] = [...byDomain.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([domain, types]) => {
        const children: TreeNode[] = [...types.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([type, ns]) => ({
            key: `d:${domain}|t:${type}`,
            label: type,
            count: ns.length,
            children: ns.map((n) => ({
              key: `n:${n.id}`,
              nodeId: n.id,
              label: n.label,
              meta: clip(n.desc, META_CLIP),
            })),
          }))
        return {
          key: `d:${domain}`,
          label: domain.toUpperCase(),
          count: children.reduce((a, c) => a + (c.children?.length ?? 0), 0),
          children,
        }
      })

    return { total: list.length, tree: out }
  }

  /**
   * 无向 BFS 求最短路径，但记录每段是否逆着边的方向走。
   * 设计稿原型遗漏了 reversed，导致逆向段的箭头方向是错的。
   */
  function path(from: string, to: string): PathResponse {
    const directLinks = edges
      .filter(
        (e) =>
          (e.source === from && e.target === to) || (e.source === to && e.target === from),
      )
      .map(detail)

    if (!nodeOf(from) || !nodeOf(to)) return { found: false, segments: [], directLinks }
    if (from === to) return { found: true, segments: [{ node: endpoint(from) }], directLinks }

    const prev = new Map<string, { from: string; edge: KgEdge; reversed: boolean }>()
    const seen = new Set([from])
    let queue = [from]

    while (queue.length) {
      const next: string[] = []
      for (const id of queue) {
        for (const e of edges) {
          const isOutgoing = e.source === id
          const nb = isOutgoing ? e.target : e.target === id ? e.source : null
          if (!nb || seen.has(nb)) continue
          seen.add(nb)
          prev.set(nb, { from: id, edge: e, reversed: !isOutgoing })

          if (nb === to) {
            const segments: PathSegment[] = []
            let cur = to
            while (cur !== from) {
              const p = prev.get(cur)!
              segments.unshift({
                node: endpoint(cur),
                edge: { id: p.edge.id, label: p.edge.label, reversed: p.reversed },
              })
              cur = p.from
            }
            segments.unshift({ node: endpoint(from) })
            return { found: true, segments, directLinks }
          }
          next.push(nb)
        }
      }
      queue = next
    }

    return { found: false, segments: [], directLinks }
  }

  /** UNIQUE(source, target, predicate)，且禁止自环。 */
  function assertLinkable(source: string, target: string, predicate: string, ignoreId?: string) {
    if (source === target) {
      throw new DbError(ERR.SELF_LOOP, 'A relation cannot point a node at itself')
    }
    mustNode(source)
    mustNode(target)
    const duplicate = edges.some(
      (e) =>
        e.id !== ignoreId &&
        e.source === source &&
        e.target === target &&
        e.predicate === predicate,
    )
    if (duplicate) throw new DbError(ERR.DUPLICATE, 'This relation already exists')
  }

  return {
    stats: (): Stats => ({ nodeCount: nodes.length, linkCount: edges.length }),
    neighborhood,
    tree,
    path,

    taxonomy: (): Taxonomy => ({
      domains: [...new Set(nodes.map((n) => n.domain).filter(Boolean))].sort(),
      types: [...new Set(nodes.map((n) => n.type).filter(Boolean))].sort(),
    }),

    nodeLinks: (id: string): LinkDetail[] => {
      mustNode(id)
      return edges.filter((e) => e.source === id || e.target === id).map(detail)
    },

    link: (id: string): LinkDetail => detail(mustEdge(id)),

    createNode: (input: NodeInput): KgNode => {
      const node: KgNode = { id: nextId('n'), ...input }
      nodes = [...nodes, node]
      return clone(node)
    },

    updateNode: (id: string, patch: Partial<NodeInput>): KgNode => {
      mustNode(id)
      nodes = nodes.map((n) => (n.id === id ? { ...n, ...patch } : n))
      return clone(mustNode(id))
    },

    deleteNode: (id: string): DeleteNodeResult => {
      mustNode(id)
      const deletedLinkIds = edges
        .filter((e) => e.source === id || e.target === id)
        .map((e) => e.id)
      nodes = nodes.filter((n) => n.id !== id)
      edges = edges.filter((e) => e.source !== id && e.target !== id)
      return { deletedNodeId: id, deletedLinkIds }
    },

    createLink: (input: LinkInput): LinkDetail => {
      const predicate = input.predicate ?? input.label
      assertLinkable(input.source, input.target, predicate)
      const edge: KgEdge = {
        id: nextId('e'),
        source: input.source,
        target: input.target,
        label: input.label,
        predicate,
        directed: true,
      }
      edges = [...edges, edge]
      return detail(edge)
    },

    updateLink: (id: string, patch: { label?: string; predicate?: string }): LinkDetail => {
      const edge = mustEdge(id)
      const predicate = patch.predicate ?? patch.label ?? edge.predicate
      assertLinkable(edge.source, edge.target, predicate, id)
      edges = edges.map((e) => (e.id === id ? { ...e, ...patch, predicate } : e))
      return detail(mustEdge(id))
    },

    reverseLink: (id: string): LinkDetail => {
      const edge = mustEdge(id)
      assertLinkable(edge.target, edge.source, edge.predicate, id)
      edges = edges.map((e) => (e.id === id ? { ...e, source: e.target, target: e.source } : e))
      return detail(mustEdge(id))
    },

    deleteLink: (id: string): DeleteLinkResult => {
      mustEdge(id)
      edges = edges.filter((e) => e.id !== id)
      return { deletedLinkId: id }
    },
  }
}

export type KgDb = ReturnType<typeof createDb>
