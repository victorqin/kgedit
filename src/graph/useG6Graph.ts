import { useEffect, useRef } from 'react'
import type { GraphPayload } from '@/api/types'
import { ACCENT, type Side } from '@/theme/antdTheme'
import { buildGraphOptions, SIMPLIFY_THRESHOLD, toG6Data } from './graphOptions'
import type { Selection } from '@/stores/slices/selection'

/** 单击与双击去重窗口。双击会先触发一次 click，那是一次白发的网络请求。 */
const DBLCLICK_GUARD_MS = 250

/** 缩放下限。低于这个比例卡片上的字就读不了了。 */
const MIN_ZOOM = 0.5

export interface G6Handlers {
  onNodeClick: (id: string) => void
  onNodeDblClick: (id: string) => void
  onNodeContextMenu: (id: string) => void
  onEdgeClick: (id: string) => void
  onEdgeContextMenu: (id: string) => void
  onCanvasClick: () => void
}

interface GraphLike {
  setData: (d: unknown) => void
  render: () => Promise<unknown>
  destroy: () => void
  fitView: (options?: { when?: 'overflow' | 'always' }, animation?: false) => Promise<unknown>
  getZoom: () => number
  zoomTo: (zoom: number, animation?: false) => Promise<unknown>
  focusElement: (id: string, animation?: false) => Promise<unknown>
  setElementState: (state: Record<string, string[]>) => void | Promise<unknown>
  on: (event: string, cb: (e: { target?: { id?: string } }) => void) => void
}

interface Options {
  payload: GraphPayload | null
  side: Side
  selection: Selection | null
  handlers: G6Handlers
}

export function useG6Graph({ payload, side, selection, handlers }: Options) {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<GraphLike | null>(null)
  const clickTimer = useRef<number>(undefined)
  // handlers 每次渲染都是新对象，用 ref 存住，避免重建图实例。
  // 赋值放在 effect 里：渲染期写 ref 会触发级联渲染告警，而事件回调
  // 只可能在挂载之后触发，那时 effect 已经跑过了。
  const handlersRef = useRef(handlers)
  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  const simplified = (payload?.nodes.length ?? 0) > SIMPLIFY_THRESHOLD

  // 节点类型无法热切换，只有跨越简化阈值时才重建实例
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let disposed = false
    let graph: GraphLike | null = null

    void (async () => {
      const { Graph } = await import('@antv/g6')
      if (disposed) return

      graph = new Graph({
        container: el,
        ...buildGraphOptions({ side, simplified }),
      } as never) as unknown as GraphLike
      graphRef.current = graph

      graph.on('edge:click', (e) => {
        const id = e.target?.id
        if (id) handlersRef.current.onEdgeClick(id)
      })
      graph.on('edge:contextmenu', (e) => {
        const id = e.target?.id
        if (id) handlersRef.current.onEdgeContextMenu(id)
      })
      graph.on('canvas:click', () => handlersRef.current.onCanvasClick())
    })()

    // HTML 节点是真实 DOM，用事件委托而不是 G6 的节点事件
    const resolve = (ev: Event) =>
      (ev.target as HTMLElement | null)?.closest?.('[data-node-id]') as HTMLElement | null

    const onClick = (ev: MouseEvent) => {
      const hit = resolve(ev)
      if (!hit) return
      const id = hit.dataset.nodeId!
      window.clearTimeout(clickTimer.current)
      clickTimer.current = window.setTimeout(
        () => handlersRef.current.onNodeClick(id),
        DBLCLICK_GUARD_MS,
      )
    }

    const onDblClick = (ev: MouseEvent) => {
      const hit = resolve(ev)
      if (!hit) return
      window.clearTimeout(clickTimer.current)
      handlersRef.current.onNodeDblClick(hit.dataset.nodeId!)
    }

    const onContextMenu = (ev: MouseEvent) => {
      const hit = resolve(ev)
      if (!hit) return
      ev.preventDefault()
      ev.stopPropagation()
      handlersRef.current.onNodeContextMenu(hit.dataset.nodeId!)
    }

    el.addEventListener('click', onClick)
    el.addEventListener('dblclick', onDblClick)
    el.addEventListener('contextmenu', onContextMenu)

    return () => {
      disposed = true
      window.clearTimeout(clickTimer.current)
      el.removeEventListener('click', onClick)
      el.removeEventListener('dblclick', onDblClick)
      el.removeEventListener('contextmenu', onContextMenu)
      try {
        graph?.destroy()
      } catch {
        // 实例可能尚未初始化完成
      }
      graphRef.current = null
    }
  }, [side, simplified])

  // 数据变化走差量更新，不销毁重建 —— 否则每次编辑后 d3-force 都会重新散开，
  // 用户会丢失对图的心智位置。
  useEffect(() => {
    const graph = graphRef.current
    if (!graph || !payload) return
    let cancelled = false

    void (async () => {
      graph.setData(toG6Data(payload))
      await graph.render()
      if (cancelled) return
      try {
        // 只在内容溢出时缩放，避免两三个节点时被放得过大
        await graph.fitView({ when: 'overflow' }, false)
        // 节点多时 fitView 会把字缩到看不清；触底后改为聚焦中心节点，
        // 其余部分交给用户平移，总比全都看不清强。
        if (graph.getZoom() < MIN_ZOOM) {
          await graph.zoomTo(MIN_ZOOM, false)
          const center = payload.meta.centerId
          if (center) await graph.focusElement(center, false)
        }
      } catch {
        // 布局尚未就绪时忽略
      }
    })()

    return () => {
      cancelled = true
    }
  }, [payload])

  // 选中态：节点卡片直接改样式，边走 G6 的 state
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const accent = ACCENT[side]

    el.querySelectorAll<HTMLElement>('[data-node-id]').forEach((card) => {
      const isSelected =
        selection?.kind === 'node' && selection.side === side && selection.id === card.dataset.nodeId
      const isCenter = card.dataset.center === '1'
      if (isSelected) {
        card.style.borderColor = '#f59e0b'
        card.style.boxShadow = '0 0 0 2px #f59e0b,0 0 24px #f59e0b33'
      } else {
        card.style.borderColor = isCenter ? accent : '#2b3543'
        card.style.boxShadow = isCenter
          ? `0 0 0 2px ${accent},0 0 26px ${accent}40`
          : '0 2px 10px #00000066'
      }
    })

    const graph = graphRef.current
    if (!graph || !payload) return
    const states: Record<string, string[]> = {}
    payload.edges.forEach((e) => {
      states[e.id] = []
    })
    if (selection?.kind === 'edge' && selection.side === side) states[selection.id] = ['selected']
    // 图尚未渲染完成时这里会失败，同步与异步两条路径都要接住
    try {
      void Promise.resolve(graph.setElementState(states)).catch(() => {})
    } catch {
      /* 实例已销毁 */
    }
  }, [selection, side, payload])

  return { containerRef, simplified }
}
