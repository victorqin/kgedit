import { getNeighborhood, getPath, getStats } from '@/api/graph'
import { ApiError } from '@/api/client'
import type { GraphPayload, PathResponse, Stats } from '@/api/types'
import { seq } from '@/lib/requestSeq'
import type { Side } from '@/theme/antdTheme'
import type { SliceCreator } from '../useKgStore'

export interface GraphSlice {
  startId: string | null
  endId: string | null
  hops: number
  leftSub: GraphPayload | null
  rightSub: GraphPayload | null
  path: PathResponse | null
  stats: Stats | null
  loading: { L: boolean; R: boolean; path: boolean }
  error: { L: string | null; R: string | null }
  setHops: (n: number) => void
  setCenter: (side: Side, id: string) => Promise<void>
  loadSide: (side: Side) => Promise<void>
  loadPath: () => Promise<void>
  loadStats: () => Promise<void>
  refreshAll: () => Promise<void>
}

const CENTER_KEY = { L: 'startId', R: 'endId' } as const
const SUB_KEY = { L: 'leftSub', R: 'rightSub' } as const

export const createGraphSlice: SliceCreator<GraphSlice> = (set, get) => ({
  startId: null,
  endId: null,
  hops: 2,
  leftSub: null,
  rightSub: null,
  path: null,
  stats: null,
  loading: { L: false, R: false, path: false },
  error: { L: null, R: null },

  /** 整数、下限 1、无上限 —— 上限由服务端 nodeCap 兜底并通过 meta.truncated 反馈。 */
  setHops: (n) => {
    const next = Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1
    if (next === get().hops) return
    set((s) => {
      s.hops = next
    })
    void get().loadSide('L')
    void get().loadSide('R')
  },

  setCenter: async (side, id) => {
    set((s) => {
      s[CENTER_KEY[side]] = id
    })
    await Promise.all([get().loadSide(side), get().loadPath()])

    // 重新聚焦后输入框必须跟着走，否则会出现「框里写着 A、图上画着 B」的错位。
    // 与 loadSide 里那次「仅当为空才回填」不同：那是为了从 URL 直接进入时补全，
    // 这里是显式换中心，无论框里原本是什么都要覆盖。
    const label = get()[SUB_KEY[side]]?.nodes.find((n) => n.id === id)?.label
    if (label) {
      set((s) => {
        s[side === 'L' ? 'qStart' : 'qEnd'] = label
      })
    }
  },

  loadSide: async (side) => {
    const centerId = get()[CENTER_KEY[side]]
    if (!centerId) return

    const key = `neighborhood:${side}`
    const ticket = seq.next(key)
    set((s) => {
      s.loading[side] = true
      s.error[side] = null
    })

    try {
      const data = await getNeighborhood({ centerId, hops: get().hops })
      if (!seq.isCurrent(key, ticket)) return // 过期响应，丢弃
      set((s) => {
        s[SUB_KEY[side]] = data
        // 输入框还空着就回填中心节点名 —— 从 URL 直接进来时没人填过它。
        // 用户已经输入了内容则不覆盖。
        const queryKey = side === 'L' ? 'qStart' : 'qEnd'
        if (!s[queryKey].trim()) {
          const center = data.nodes.find((n) => n.id === data.meta.centerId)
          if (center) s[queryKey] = center.label
        }
      })
    } catch (e) {
      if (!seq.isCurrent(key, ticket)) return
      set((s) => {
        s.error[side] = e instanceof ApiError ? e.message : 'Request failed'
      })
    } finally {
      if (seq.isCurrent(key, ticket)) {
        set((s) => {
          s.loading[side] = false
        })
      }
    }
  },

  loadPath: async () => {
    const { startId, endId } = get()
    if (!startId || !endId) {
      set((s) => {
        s.path = null
      })
      return
    }

    const ticket = seq.next('path')
    set((s) => {
      s.loading.path = true
    })
    try {
      const data = await getPath({ from: startId, to: endId })
      if (!seq.isCurrent('path', ticket)) return
      set((s) => {
        s.path = data
      })
    } catch {
      if (!seq.isCurrent('path', ticket)) return
      set((s) => {
        s.path = null
      })
    } finally {
      if (seq.isCurrent('path', ticket)) {
        set((s) => {
          s.loading.path = false
        })
      }
    }
  },

  loadStats: async () => {
    const data = await getStats()
    set((s) => {
      s.stats = data
    })
  },

  /**
   * 写操作成功后调用。一次写会同时波及左图、右图、路径栏、统计与连接列表，
   * 这些读互相独立，并行发出，不串成瀑布。
   */
  refreshAll: async () => {
    await Promise.all([
      get().loadSide('L'),
      get().loadSide('R'),
      get().loadPath(),
      get().loadStats(),
      get().reloadLinks(),
    ])
  },
})
