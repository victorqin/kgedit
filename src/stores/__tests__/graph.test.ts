import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { http, HttpResponse, delay } from 'msw'
import { server, resetDb } from '@/mocks/node'
import { useKgStore } from '../useKgStore'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetDb()
})
afterAll(() => server.close())
beforeEach(() => useKgStore.setState(useKgStore.getInitialState(), true))

const s = () => useKgStore.getState()

describe('setHops', () => {
  it.each([
    [0, 1],
    [-5, 1],
    [Number.NaN, 1],
    [2.7, 2],
    [1, 1],
    [7, 7],
    [99, 99],
  ])('clamps %s to %s — positive integer, no upper bound', (input, expected) => {
    s().setHops(input)
    expect(s().hops).toBe(expected)
  })
})

describe('loadSide', () => {
  it('stores the subgraph for the requested side only', async () => {
    useKgStore.setState({ startId: 'a101' })
    await s().loadSide('L')
    expect(s().leftSub?.meta.centerId).toBe('a101')
    expect(s().rightSub).toBeNull()
  })

  it('clears the loading flag when the request settles', async () => {
    useKgStore.setState({ startId: 'a101' })
    await s().loadSide('L')
    expect(s().loading.L).toBe(false)
  })

  it('records an error message instead of throwing when the request fails', async () => {
    server.use(
      http.get('*/api/graph/neighborhood', () =>
        HttpResponse.json({ code: 500, data: null, message: 'boom' }, { status: 500 }),
      ),
    )
    useKgStore.setState({ startId: 'a101' })
    await s().loadSide('L')
    expect(s().error.L).toBe('boom')
    expect(s().loading.L).toBe(false)
  })

  it('clears a previous error on a later success', async () => {
    useKgStore.setState({ startId: 'a101', error: { L: 'stale', R: null } })
    await s().loadSide('L')
    expect(s().error.L).toBeNull()
  })

  it('is a no-op when the side has no center', async () => {
    await s().loadSide('L')
    expect(s().leftSub).toBeNull()
  })
})

describe('stale response handling', () => {
  it('discards a slow earlier response so the newest center wins', async () => {
    let call = 0
    server.use(
      http.get('*/api/graph/neighborhood', async ({ request }) => {
        const id = new URL(request.url).searchParams.get('centerId')
        // 第一个请求故意慢，模拟用户快速切换中心节点
        await delay(call++ === 0 ? 120 : 5)
        return HttpResponse.json({
          code: 0,
          message: '',
          data: {
            nodes: [],
            edges: [],
            meta: { centerId: id, hops: 2, truncated: false, nodeCap: 200, totalNodes: 0 },
          },
        })
      }),
    )

    const slow = s().setCenter('L', 'a101')
    const fast = s().setCenter('L', 'dbb')
    await Promise.all([slow, fast])

    expect(s().leftSub?.meta.centerId).toBe('dbb')
    expect(s().startId).toBe('dbb')
  })
})

describe('loadPath', () => {
  it('stores segments and the direct relations between the endpoints', async () => {
    useKgStore.setState({ startId: 'gwd', endId: 'dbb' })
    await s().loadPath()
    expect(s().path?.found).toBe(true)
    expect(s().path?.directLinks).toHaveLength(1)
  })

  it('clears the path when either endpoint is missing', async () => {
    useKgStore.setState({ startId: 'gwd', endId: null, path: { found: true, segments: [], directLinks: [] } })
    await s().loadPath()
    expect(s().path).toBeNull()
  })
})

describe('loadStats', () => {
  it('reads the live graph size for the header line', async () => {
    await s().loadStats()
    expect(s().stats).toEqual({ nodeCount: 14, linkCount: 15 })
  })
})

describe('setCenter', () => {
  it('loads the side and the path together', async () => {
    useKgStore.setState({ endId: 'dbb' })
    await s().setCenter('L', 'a101')
    expect(s().leftSub?.meta.centerId).toBe('a101')
    expect(s().path?.found).toBe(true)
  })
})

describe('input backfill', () => {
  it('fills an empty search box with the centered node name', async () => {
    useKgStore.setState({ startId: 'a101' })
    await s().loadSide('L')
    expect(s().qStart).toBe('A101 System')
  })

  it('does not clobber text the user has already typed', async () => {
    useKgStore.setState({ startId: 'a101', qStart: 'my own text' })
    await s().loadSide('L')
    expect(s().qStart).toBe('my own text')
  })
})

describe('setCenter keeps the search box in sync', () => {
  it('overwrites the search box with the new center label', async () => {
    useKgStore.setState({ startId: 'a101', qStart: 'A101 System' })
    await s().loadSide('L')
    await s().setCenter('L', 'gwd')
    expect(s().qStart).toBe('Gateway D')
  })

  it('does the same on the end side', async () => {
    useKgStore.setState({ endId: 'dbb', qEnd: 'Database B' })
    await s().loadSide('R')
    await s().setCenter('R', 'bk1')
    expect(s().qEnd).toBe('Backup Cluster B1')
  })

  it('leaves the other side alone', async () => {
    useKgStore.setState({ startId: 'a101', qStart: 'A101 System', qEnd: 'Database B' })
    await s().setCenter('L', 'gwd')
    expect(s().qEnd).toBe('Database B')
  })
})

describe('focusNode', () => {
  it('centers the side and selects the node in one action', async () => {
    await s().focusNode('L', 'gwd')
    expect(s().startId).toBe('gwd')
    expect(s().sel).toEqual({ side: 'L', kind: 'node', id: 'gwd' })
  })

  it('fills the relation list with that node relations', async () => {
    await s().focusNode('L', 'gwd')
    // gwd 有 caches / reads / stores 三条
    expect(s().links).toHaveLength(3)
    expect(s().links.map((l) => l.label).sort()).toEqual(['caches', 'reads', 'stores'])
  })

  it('keeps the search box in sync with the new center', async () => {
    await s().focusNode('L', 'gwd')
    expect(s().qStart).toBe('Gateway D')
  })

  it('attributes the selection to the end side when focusing there', async () => {
    await s().focusNode('R', 'dbb')
    expect(s().endId).toBe('dbb')
    expect(s().sel?.side).toBe('R')
    expect(s().qEnd).toBe('Database B')
  })

  it('leaves the opposite side untouched', async () => {
    useKgStore.setState({ endId: 'dbb', qEnd: 'Database B' })
    await s().focusNode('L', 'gwd')
    expect(s().endId).toBe('dbb')
    expect(s().qEnd).toBe('Database B')
  })
})
