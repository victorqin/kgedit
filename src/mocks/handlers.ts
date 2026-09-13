import { http, HttpResponse, delay } from 'msw'
import { createDb, DbError, DEFAULT_NODE_CAP, type KgDb } from './db'
import type { LinkInput, NodeInput } from '@/api/types'

let db: KgDb = createDb()

/** 测试之间重置，避免用例互相污染 */
export const resetDb = () => {
  db = createDb()
}

export const getDb = () => db

/** 模拟网络延迟。测试模式下归零，否则整套用例会被硬生生拖慢。 */
const LATENCY = import.meta.env.MODE === 'test' ? 0 : 120

const ok = <T>(data: T) => HttpResponse.json({ code: 0, data, message: '' })

/**
 * 把 DbError 归一成同一个信封，HTTP 状态与业务码保持一致，
 * 这样前端只需处理一种错误形状。
 */
const guard = <T>(fn: () => T) => {
  try {
    return ok(fn())
  } catch (e) {
    const code = e instanceof DbError ? e.code : 500
    const message = e instanceof Error ? e.message : 'Internal error'
    return HttpResponse.json({ code, data: null, message }, { status: code })
  }
}

const intParam = (v: string | null, fallback: number) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

const B = '*/api'

export const handlers = [
  http.get(`${B}/graph/stats`, async () => {
    await delay(LATENCY)
    return guard(() => db.stats())
  }),

  http.get(`${B}/graph/neighborhood`, async ({ request }) => {
    await delay(LATENCY)
    const url = new URL(request.url)
    const centerId = url.searchParams.get('centerId') ?? ''
    const hops = intParam(url.searchParams.get('hops'), 2)
    const cap = intParam(url.searchParams.get('limit'), DEFAULT_NODE_CAP)
    return guard(() => db.neighborhood(centerId, hops, cap))
  }),

  http.get(`${B}/graph/path`, async ({ request }) => {
    await delay(LATENCY)
    const url = new URL(request.url)
    return guard(() =>
      db.path(url.searchParams.get('from') ?? '', url.searchParams.get('to') ?? ''),
    )
  }),

  http.get(`${B}/nodes/tree`, async ({ request }) => {
    await delay(LATENCY)
    const url = new URL(request.url)
    return guard(() =>
      db.tree(url.searchParams.get('q') ?? '', intParam(url.searchParams.get('limit'), 50)),
    )
  }),

  http.get(`${B}/meta/taxonomy`, async () => {
    await delay(LATENCY)
    return guard(() => db.taxonomy())
  }),

  http.get(`${B}/nodes/:id/links`, async ({ params }) => {
    await delay(LATENCY)
    return guard(() => db.nodeLinks(String(params.id)))
  }),

  http.post(`${B}/nodes`, async ({ request }) => {
    await delay(LATENCY)
    const body = (await request.json()) as NodeInput
    return guard(() => db.createNode(body))
  }),

  http.patch(`${B}/nodes/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    const body = (await request.json()) as Partial<NodeInput>
    return guard(() => db.updateNode(String(params.id), body))
  }),

  http.delete(`${B}/nodes/:id`, async ({ params }) => {
    await delay(LATENCY)
    return guard(() => db.deleteNode(String(params.id)))
  }),

  http.get(`${B}/links/:id`, async ({ params }) => {
    await delay(LATENCY)
    return guard(() => db.link(String(params.id)))
  }),

  http.post(`${B}/links/:id/reverse`, async ({ params }) => {
    await delay(LATENCY)
    return guard(() => db.reverseLink(String(params.id)))
  }),

  http.post(`${B}/links`, async ({ request }) => {
    await delay(LATENCY)
    const body = (await request.json()) as LinkInput
    return guard(() => db.createLink(body))
  }),

  http.patch(`${B}/links/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    const body = (await request.json()) as { label?: string; predicate?: string }
    return guard(() => db.updateLink(String(params.id), body))
  }),

  http.delete(`${B}/links/:id`, async ({ params }) => {
    await delay(LATENCY)
    return guard(() => db.deleteLink(String(params.id)))
  }),
]
