import type { GraphPayload } from '@/api/types'
import { ACCENT, type Side } from '@/theme/antdTheme'
import { buildNodeCard, CARD_SIZE } from './nodeCard'

/**
 * 鼠标按键位掩码。注意 `button` 在 G6 合成的 dragstart 上恒为 -1，
 * 能区分按键的只有 `buttons`。
 */
export const MOUSE_BUTTONS = { LEFT: 1, RIGHT: 2, MIDDLE: 4 } as const

/** G6 标准事件里的命中类型，`canvas` 表示没命中任何元素。 */
export interface DragGateEvent {
  buttons?: number
  targetType?: 'canvas' | 'node' | 'edge' | 'combo'
}

/**
 * 只有按住中键才允许拖拽 —— 画布平移与节点拖动都是。
 *
 * 这样做有两个好处：
 * 1. 左键回归纯粹的选择语义，不会和拖拽抢事件。
 * 2. 根除了「弹窗关掉后节点跟着鼠标跑」的问题：右键 pointerdown 后
 *    contextmenu 打开弹窗，pointerup 被弹窗吞掉，G6 里留下一个没清掉的
 *    按下记录；弹窗关闭后鼠标一动就补发 dragstart。那一刻没有任何键按下
 *    （buttons === 0），这里直接拒绝，拖拽就无从发生。
 *
 * 但这只是「能不能拖」的一半。另一半是「拖的是谁」，见下面两个谓词。
 */
export const isMiddleButtonDrag = (event: DragGateEvent): boolean =>
  event.buttons === MOUSE_BUTTONS.MIDDLE

/** 中键按在节点上 → 只拖这一个节点，别的节点不动，连线被拉扯。 */
export const canDragNode = (event: DragGateEvent): boolean =>
  isMiddleButtonDrag(event) && event.targetType === 'node'

/**
 * 中键按在节点以外的任何地方（空白画布、连线）→ 平移整张图。
 *
 * 命中类型这一层判断本来是 G6 内置 enable 自带的
 * （drag-canvas 只认 canvas，drag-element 只认 node/combo），
 * 我们用自定义 enable 覆盖它时把这层一并覆盖没了，于是中键拖一个节点
 * 会同时满足两个行为：节点自己动，整张图也跟着平移。两个谓词必须互斥。
 *
 * 这里用「非节点」而不是「等于 canvas」：连线又细又难躲开，
 * 蹭到一条边就平移失灵是迟早会被骂的手感。
 */
export const canPanCanvas = (event: DragGateEvent): boolean =>
  isMiddleButtonDrag(event) && event.targetType !== 'node'

/**
 * 超过这个节点数就不再渲染 HTML 卡片。
 * G6 的 html 节点是每节点一个真实 DOM 元素，几百个卡片加 d3-force 会卡到不可用。
 */
export const SIMPLIFY_THRESHOLD = 120

interface G6NodeDatum {
  id: string
  data?: Record<string, unknown>
}
interface G6EdgeDatum {
  id: string
  source: string
  target: string
  data?: Record<string, unknown>
}
export interface G6Data {
  nodes: G6NodeDatum[]
  edges: G6EdgeDatum[]
}

export function toG6Data(payload: GraphPayload | null): G6Data {
  if (!payload) return { nodes: [], edges: [] }
  return {
    nodes: payload.nodes.map((n) => ({
      id: n.id,
      data: { ...n, center: n.id === payload.meta.centerId },
    })),
    edges: payload.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      data: { label: e.label },
    })),
  }
}

/** 参数取自设计稿的 d3-force 配置，保持相同的疏密手感。 */
export function buildGraphOptions({ side, simplified }: { side: Side; simplified: boolean }) {
  const accent = ACCENT[side]

  return {
    autoResize: true,
    padding: 24,
    node: simplified
      ? {
          type: 'circle',
          style: {
            size: 26,
            fill: '#121924',
            stroke: accent,
            lineWidth: 1.4,
            labelText: (d: { data?: { label?: string } }) => d.data?.label ?? '',
            labelFill: '#cbd5e1',
            labelFontSize: 11,
            labelPlacement: 'bottom',
          },
        }
      : {
          type: 'html',
          style: {
            size: CARD_SIZE,
            innerHTML: (d: { data?: Record<string, unknown> }) =>
              buildNodeCard(
                d.data as never,
                side,
                Boolean((d.data as { center?: boolean })?.center),
              ),
          },
        },
    edge: {
      // quadratic 而非 line：允许平行边之后，直线会完全重叠成一条
      type: 'quadratic',
      style: {
        stroke: accent,
        lineWidth: 1.4,
        endArrow: true,
        endArrowSize: 9,
        curveOffset: 22,
        labelText: (d: { data?: { label?: string } }) => d.data?.label ?? '',
        labelFill: '#c3cedd',
        labelFontSize: 12,
        labelFontFamily: 'IBM Plex Mono, monospace',
        labelBackground: true,
        labelBackgroundFill: '#0b1017',
        labelBackgroundStroke: '#232e3c',
        labelBackgroundLineWidth: 1,
        labelBackgroundRadius: 4,
        labelBackgroundPadding: [3, 7, 3, 7],
        labelAutoRotate: false,
        // 按边 id 散开标签沿线的位置，缓解相邻边标签互相压盖
        // （设计稿原本就有这一手，用的是同样的三个落点）
        labelPlacement: (d: { id?: string }) => {
          const id = String(d.id ?? '')
          let h = 0
          for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 3
          return [0.34, 0.5, 0.66][h]
        },
        labelPadding: 4,
      },
      state: { selected: { stroke: '#f59e0b', lineWidth: 2.6, labelFill: '#f0b046' } },
    },
    layout: {
      type: 'd3-force',
      preventOverlap: true,
      nodeSize: CARD_SIZE,
      link: { distance: 260, strength: 0.85 },
      manyBody: { strength: -520 },
      collide: { radius: 118, strength: 1, iterations: 10 },
      center: { x: 0, y: 0 },
      iterations: 300,
      animation: false,
    },
    behaviors: [
      // 拖拽统一收敛到中键，左键只负责选择；
      // 中键按在节点上就拖节点，按在别处就平移画布，两者互斥。
      { type: 'drag-canvas', enable: canPanCanvas },
      'zoom-canvas',
      { type: 'drag-element', enable: canDragNode },
    ],
  }
}
