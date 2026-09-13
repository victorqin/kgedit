import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { server, resetDb } from '@/mocks/node'
import { deleteLink } from '@/api/links'
import { createNode, deleteNode } from '@/api/nodes'
import { useKgStore } from '../useKgStore'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetDb()
})
afterAll(() => server.close())
beforeEach(() => useKgStore.setState(useKgStore.getInitialState(), true))

const s = () => useKgStore.getState()

describe('selectNode', () => {
  it('lists every relation touching the node, in both directions', async () => {
    await s().selectNode('L', 'dbb')
    const ids = s().links.map((l) => l.id)
    expect(ids).toContain('e8') // gwd -> dbb，dbb 作为 target
    expect(ids).toContain('e9') // dbb -> bk1，dbb 作为 source
  })

  it('records what is selected so the caption can describe it', async () => {
    await s().selectNode('L', 'dbb')
    expect(s().sel).toEqual({ side: 'L', kind: 'node', id: 'dbb' })
  })

  it('clears the loading flag when done', async () => {
    await s().selectNode('L', 'dbb')
    expect(s().loadingLinks).toBe(false)
  })

  it('yields an empty list for a node with no relations', async () => {
    const created = await createNode({ label: 'Lonely', type: 'X', domain: 'D', desc: '' })
    await s().selectNode('L', created.id)
    expect(s().links).toEqual([])
  })
})

describe('selectEdge', () => {
  it('narrows the list to exactly that one relation', async () => {
    await s().selectEdge('L', 'e8')
    expect(s().links).toHaveLength(1)
    expect(s().links[0].id).toBe('e8')
  })

  it('records the edge selection kind', async () => {
    await s().selectEdge('R', 'e8')
    expect(s().sel).toEqual({ side: 'R', kind: 'edge', id: 'e8' })
  })
})

describe('clearSelection', () => {
  it('empties both the selection and the list', async () => {
    await s().selectNode('L', 'dbb')
    s().clearSelection()
    expect(s().sel).toBeNull()
    expect(s().links).toEqual([])
  })
})

describe('reloadLinks', () => {
  it('re-fetches the current selection after a mutation', async () => {
    await s().selectNode('L', 'dbb')
    const before = s().links.length
    await deleteLink(s().links[0].id) // 绕过 store 直接改后端
    await s().reloadLinks()
    expect(s().links).toHaveLength(before - 1)
  })

  it('drops the selection when the selected edge no longer exists', async () => {
    await s().selectEdge('L', 'e8')
    await deleteLink('e8')
    await s().reloadLinks()
    expect(s().sel).toBeNull()
    expect(s().links).toEqual([])
  })

  it('drops the selection when the selected node no longer exists', async () => {
    await s().selectNode('L', 'dbb')
    await deleteNode('dbb')
    await s().reloadLinks()
    expect(s().sel).toBeNull()
  })

  it('is a no-op with nothing selected', async () => {
    await expect(s().reloadLinks()).resolves.toBeUndefined()
  })
})
