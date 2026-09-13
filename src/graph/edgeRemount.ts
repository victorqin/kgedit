import type { G6Data } from './graphOptions'

const endpoints = (e: { source: string; target: string }) => `${e.source} ${e.target}`

/**
 * 找出换了端点的边 —— 这些边必须先删掉再重新加，不能就地更新。
 *
 * 起因：G6 的 `setData` 对同 id 的边走就地更新，内部依次调用 graphlib 的
 * `updateEdgeSource` 和 `updateEdgeTarget`。两者各自从旧端点的 `bothEdgesMap`
 * 里 delete、往新端点 add，彼此互不知情。反转一条边时新 source 恰好是旧 target，
 * 于是第二步把第一步刚保住的那份成员关系又删掉了：
 *
 *   a→b 反转成 b→a
 *     updateEdgeSource(b)：a 失去 e1，b 保留 e1
 *     updateEdgeTarget(a)：b 失去 e1，a 拿回 e1
 *   最终 b 的关联边集合是空的。
 *
 * 拖动节点时 G6 正是靠这个集合决定重绘哪些边。所以反转之后拖 b，边不跟着走，
 * 看起来就是节点从边上脱落了；拖 a 一切正常，因为 a 那份还在。
 *
 * 删掉重加会让 graphlib 从头重建三张索引表，绕开这个缺陷。
 * 这是 @antv/graphlib@2.0.4 的上游问题，见 __tests__/edgeRemount.test.ts 里的探针。
 */
export function findRewiredEdgeIds(prev: G6Data | null, next: G6Data): string[] {
  if (!prev?.edges.length) return []
  const before = new Map(prev.edges.map((e) => [e.id, endpoints(e)]))
  return next.edges
    .filter((e) => {
      const was = before.get(e.id)
      return was !== undefined && was !== endpoints(e)
    })
    .map((e) => e.id)
}
