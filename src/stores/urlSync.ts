import { useEffect, useRef } from 'react'
import { useKgStore } from './useKgStore'

export interface UrlState {
  start?: string
  end?: string
  hops?: number
}

/** URL 即状态：视图可分享、可收藏、刷新不丢。 */
export function readStateFromUrl(search: string): UrlState {
  const params = new URLSearchParams(search)
  const out: UrlState = {}

  const start = params.get('start')
  if (start) out.start = start

  const end = params.get('end')
  if (end) out.end = end

  const raw = params.get('hops')
  if (raw !== null) {
    const n = Number(raw)
    if (Number.isFinite(n)) out.hops = Math.max(1, Math.floor(n))
  }

  return out
}

export function writeStateToUrl(s: {
  startId: string | null
  endId: string | null
  hops: number
}): string {
  const params = new URLSearchParams()
  if (s.startId) params.set('start', s.startId)
  if (s.endId) params.set('end', s.endId)
  params.set('hops', String(s.hops))
  return `?${params.toString()}`
}

/**
 * 挂载时从 URL 灌入初值并触发首次加载；之后订阅三个视图参数的变化回写。
 * 用 replaceState 而非 pushState —— 否则每调一次 hops 都会在浏览器历史里堆一条。
 */
export function useUrlSync() {
  const hydrated = useRef(false)

  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true

    const { start, end, hops } = readStateFromUrl(window.location.search)
    const store = useKgStore.getState()

    useKgStore.setState((s) => {
      if (start) s.startId = start
      if (end) s.endId = end
      if (hops) s.hops = hops
    })

    void Promise.all([
      store.loadSide('L'),
      store.loadSide('R'),
      store.loadPath(),
      store.loadStats(),
    ])
  }, [])

  useEffect(
    () =>
      useKgStore.subscribe((state, prev) => {
        if (
          state.startId === prev.startId &&
          state.endId === prev.endId &&
          state.hops === prev.hops
        ) {
          return
        }
        const next = writeStateToUrl(state)
        if (next !== window.location.search) {
          window.history.replaceState(null, '', `${window.location.pathname}${next}`)
        }
      }),
    [],
  )
}
