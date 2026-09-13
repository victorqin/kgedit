import type { GraphPayload } from '@/api/types'
import { ACCENT, type Side } from '@/theme/antdTheme'
import { buildNodeCard, CARD_SIZE } from './nodeCard'

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
    behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
  }
}
