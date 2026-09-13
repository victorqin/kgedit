import type { KgNode } from '@/api/types'
import { escapeHtml } from '@/lib/escape'
import { ACCENT, type Side } from '@/theme/antdTheme'

export const CARD_SIZE: [number, number] = [184, 112]

const EMPTY = '—'

/**
 * 设计稿 cardHTML() 的移植。返回字符串交给 G6 的 html 节点渲染，
 * 所有插值均经 escapeHtml 处理。
 */
export function buildNodeCard(node: KgNode, side: Side, isCenter: boolean): string {
  const accent = ACCENT[side]
  const border = isCenter ? accent : '#2b3543'
  const shadow = isCenter
    ? `0 0 0 2px ${accent},0 0 26px ${accent}40`
    : '0 2px 10px #00000066'
  const titleColor = isCenter ? accent : '#e2e8f0'
  const title = escapeHtml(isCenter ? `${node.label} ★` : node.label)

  return (
    `<div data-node-id="${escapeHtml(node.id)}" data-center="${isCenter ? '1' : '0'}" ` +
    `style="width:184px;height:112px;box-sizing:border-box;padding:9px 11px;border-radius:9px;` +
    `background:#121924;border:1px solid ${border};font-family:'IBM Plex Sans',sans-serif;` +
    `cursor:pointer;overflow:hidden;user-select:none;box-shadow:${shadow}">` +
    `<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">` +
    `<span style="width:8px;height:8px;flex:none;border-radius:2px;background:${accent}"></span>` +
    `<span style="color:${titleColor};font-size:13.5px;font-weight:600;white-space:nowrap;` +
    `overflow:hidden;text-overflow:ellipsis">${title}</span>` +
    `</div>` +
    `<div style="display:flex;gap:5px;font-size:12px;line-height:1.4;margin-bottom:3px">` +
    `<span style="color:#7d8b9f;flex:none">Type:</span>` +
    `<span style="color:#cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">` +
    `${escapeHtml(node.type) || EMPTY}</span></div>` +
    `<div style="display:flex;gap:5px;font-size:12px;line-height:1.4;max-height:34px;overflow:hidden">` +
    `<span style="color:#7d8b9f;flex:none">Desc:</span>` +
    `<span style="color:#9aa7b9;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;` +
    `overflow:hidden">${escapeHtml(node.desc) || EMPTY}</span></div>` +
    `</div>`
  )
}
