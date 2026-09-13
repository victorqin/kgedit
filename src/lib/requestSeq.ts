/**
 * 读操作的竞态守卫。
 *
 * 用户快速切换中心节点时，先发出的请求可能后返回，会把新数据覆盖成旧的：
 *   切到 A → 发请求1    切到 B → 发请求2    请求2 先回(B) → 请求1 后回(A)
 *   结果界面标着 B，画的却是 A 的邻居。
 *
 * 发请求前取号，回来时号对不上就丢弃。
 */
export function createSeq() {
  const counters = new Map<string, number>()
  return {
    next(key: string): number {
      const value = (counters.get(key) ?? 0) + 1
      counters.set(key, value)
      return value
    },
    isCurrent(key: string, ticket: number): boolean {
      return counters.get(key) === ticket
    },
  }
}

export const seq = createSeq()
