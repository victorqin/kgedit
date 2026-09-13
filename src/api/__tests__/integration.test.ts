import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { server, resetDb } from '@/mocks/node'
import { getNeighborhood, getPath, getStats } from '../graph'
import {
  createNode,
  deleteNode,
  getNodeLinks,
  getNodeTree,
  getTaxonomy,
  updateNode,
} from '../nodes'
import { createLink, deleteLink, getLink, reverseLink, updateLink } from '../links'
import { ApiError } from '../client'
import { ERR } from '../types'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetDb()
})
afterAll(() => server.close())

describe('api over msw — the whole axios + envelope + db chain', () => {
  it('unwraps the envelope so callers receive the payload directly', async () => {
    await expect(getStats()).resolves.toEqual({ nodeCount: 14, linkCount: 15 })
  })

  it('fetches a neighborhood with meta', async () => {
    const sub = await getNeighborhood({ centerId: 'a101', hops: 1 })
    expect(sub.meta.centerId).toBe('a101')
    expect(sub.nodes.length).toBeGreaterThan(1)
  })

  it('passes hops through to the server', async () => {
    const one = await getNeighborhood({ centerId: 'a101', hops: 1 })
    const two = await getNeighborhood({ centerId: 'a101', hops: 2 })
    expect(two.nodes.length).toBeGreaterThan(one.nodes.length)
  })

  it('reports truncation through meta when the limit bites', async () => {
    const sub = await getNeighborhood({ centerId: 'a101', hops: 9, limit: 3 })
    expect(sub.meta.truncated).toBe(true)
    expect(sub.meta.totalNodes).toBeGreaterThan(3)
  })

  it('fetches the hierarchical tree for the picker', async () => {
    const { tree } = await getNodeTree({ q: 'database' })
    const leaves = tree.flatMap((d) => d.children ?? []).flatMap((t) => t.children ?? [])
    expect(leaves.map((n) => n.nodeId)).toContain('dbb')
  })

  it('supplies taxonomy candidates for the editor dropdowns', async () => {
    const t = await getTaxonomy()
    expect(t.domains.length).toBeGreaterThan(0)
    expect(t.types.length).toBeGreaterThan(0)
  })

  it("lists a node's links with resolved endpoint labels", async () => {
    const links = await getNodeLinks('dbb')
    expect(links[0].source.label).toBeTruthy()
    expect(links[0].target.label).toBeTruthy()
  })

  it('fetches a single relation by id', async () => {
    await expect(getLink('e8')).resolves.toMatchObject({ id: 'e8', label: 'stores' })
  })

  it('returns path segments carrying the reversed flag', async () => {
    const p = await getPath({ from: 'dbb', to: 'a101' })
    expect(p.found).toBe(true)
    expect(p.segments.some((s) => s.edge?.reversed)).toBe(true)
  })

  it('reports relations that already join the two endpoints', async () => {
    const p = await getPath({ from: 'gwd', to: 'dbb' })
    expect(p.directLinks).toHaveLength(1)
  })

  it('surfaces a self loop as ApiError with the 422 business code', async () => {
    await expect(createLink({ source: 'a101', target: 'a101', label: 'x' })).rejects.toMatchObject({
      code: ERR.SELF_LOOP,
    })
  })

  it('surfaces a duplicate relation as ApiError', async () => {
    await createLink({ source: 'appc', target: 'dbb', label: 'reads' })
    await expect(createLink({ source: 'appc', target: 'dbb', label: 'reads' })).rejects.toBeInstanceOf(
      ApiError,
    )
  })

  it('round-trips a node through create, update and delete', async () => {
    const created = await createNode({ label: 'Temp', type: 'T', domain: 'D', desc: '' })
    const updated = await updateNode(created.id, { label: 'Temp 2' })
    expect(updated.label).toBe('Temp 2')
    await expect(deleteNode(created.id)).resolves.toMatchObject({ deletedNodeId: created.id })
  })

  it('reports the relations removed alongside a deleted node', async () => {
    const res = await deleteNode('dbb')
    expect(res.deletedLinkIds.length).toBeGreaterThan(0)
  })

  it('reverses a link in place, keeping its id', async () => {
    const before = await getLink('e8')
    const after = await reverseLink('e8')
    expect(after.id).toBe('e8')
    expect(after.source.id).toBe(before.target.id)
  })

  it('edits a relation label', async () => {
    await expect(updateLink('e8', { label: 'persists' })).resolves.toMatchObject({
      label: 'persists',
    })
  })

  it('deletes a link', async () => {
    await expect(deleteLink('e8')).resolves.toEqual({ deletedLinkId: 'e8' })
  })

  it('maps an unknown node to a 404 ApiError', async () => {
    await expect(getNodeLinks('nope')).rejects.toMatchObject({ code: ERR.NOT_FOUND })
  })

  it('keeps the business message intact for the ui to display', async () => {
    await expect(createLink({ source: 'a101', target: 'a101', label: 'x' })).rejects.toMatchObject({
      message: 'A relation cannot point a node at itself',
    })
  })
})
