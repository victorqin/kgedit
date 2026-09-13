const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/**
 * G6 的 HTML 节点通过 innerHTML 注入，而卡片内容来自用户输入，
 * 因此每一处插值都必须先过这里。
 * & 必须最先替换，否则后续生成的实体会被二次转义。
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).replace(/[&<>"']/g, (c) => ENTITIES[c])
}
