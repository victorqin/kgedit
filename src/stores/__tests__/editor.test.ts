import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server, resetDb } from '@/mocks/node'
import { getStats } from '@/api/graph'
import { getNodeLinks } from '@/api/nodes'
import { useKgStore } from '../useKgStore'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetDb()
})
afterAll(() => server.close())
beforeEach(() => useKgStore.setState(useKgStore.getInitialState(), true))

const s = () => useKgStore.getState()

describe('withBlocking', () => {
  it('raises the blocking flag for the duration of the work', async () => {
    const seen: boolean[] = []
    await s().withBlocking(async () => {
      seen.push(useKgStore.getState().blocking)
    })
    expect(seen).toEqual([true])
    expect(s().blocking).toBe(false)
  })

  it('lowers the flag even when the work throws', async () => {
    await expect(
      s().withBlocking(async () => {
        throw new Error('x')
      }),
    ).rejects.toThrow()
    expect(s().blocking).toBe(false)
  })
})

describe('saveEditor — create', () => {
  it('POSTs only on save, so a cancelled editor leaves no orphan node', async () => {
    const before = (await getStats()).nodeCount
    s().openNodeEditor(null, 'L')
    s().closeEditor(true)
    expect((await getStats()).nodeCount).toBe(before)
  })

  it('creates the node and makes it the center of its side on save', async () => {
    s().openNodeEditor(null, 'L')
    s().setDraft({ label: 'Kafka Topic A', type: 'Kafka Topic', domain: 'Streaming', desc: '' })
    await s().saveEditor()
    expect(s().startId).toBeTruthy()
    expect(s().leftSub?.nodes[0].label).toBe('Kafka Topic A')
  })

  it('leaves the other side untouched when creating on the left', async () => {
    useKgStore.setState({ endId: 'dbb' })
    s().openNodeEditor(null, 'L')
    s().setDraft({ label: 'New One', type: 'T', domain: 'D', desc: '' })
    await s().saveEditor()
    expect(s().endId).toBe('dbb')
  })
})

describe('saveEditor — update', () => {
  it('persists every field including the domain the design canvas was missing', async () => {
    s().openNodeEditor('dbb', 'L')
    s().setDraft({ label: 'Primary DB', domain: 'Streaming' })
    await s().saveEditor()
    const links = await getNodeLinks('dbb')
    const touched = links.some(
      (l) => l.source.label === 'Primary DB' || l.target.label === 'Primary DB',
    )
    expect(touched).toBe(true)
  })

  it('closes the editor after a successful save', async () => {
    s().openNodeEditor('dbb', 'L')
    s().setDraft({ label: 'X' })
    await s().saveEditor()
    expect(s().editor).toBeNull()
  })

  it('keeps the editor open and surfaces the message when the save fails', async () => {
    server.use(
      http.patch('*/api/nodes/:id', () =>
        HttpResponse.json({ code: 500, data: null, message: 'nope' }, { status: 500 }),
      ),
    )
    s().openNodeEditor('dbb', 'L')
    s().setDraft({ label: 'X' })
    await s().saveEditor()
    expect(s().editor).not.toBeNull()
    expect(s().editor?.error).toBe('nope')
  })
})

describe('setDraft', () => {
  it('marks the editor dirty so closing can warn', () => {
    s().openNodeEditor('dbb', 'L')
    expect(s().editor?.dirty).toBe(false)
    s().setDraft({ label: 'changed' })
    expect(s().editor?.dirty).toBe(true)
  })

  it('refuses to close a dirty editor without force', () => {
    s().openNodeEditor('dbb', 'L')
    s().setDraft({ label: 'changed' })
    s().closeEditor()
    expect(s().editor).not.toBeNull()
  })

  it('closes a clean editor without fuss', () => {
    s().openNodeEditor('dbb', 'L')
    s().closeEditor()
    expect(s().editor).toBeNull()
  })
})

describe('runConfirm — reverseLink', () => {
  it('swaps the endpoints and refreshes the list', async () => {
    await s().selectNode('L', 'dbb')
    const before = s().links.find((l) => l.id === 'e8')!
    s().askConfirm({ kind: 'reverseLink', id: 'e8' })
    await s().runConfirm()
    const after = s().links.find((l) => l.id === 'e8')!
    expect(after.source.id).toBe(before.target.id)
  })

  it('clears the confirm dialog when done', async () => {
    await s().selectNode('L', 'dbb')
    s().askConfirm({ kind: 'reverseLink', id: 'e8' })
    await s().runConfirm()
    expect(s().confirm).toBeNull()
  })

  it('reports a refused reversal without losing the dialog state silently', async () => {
    await s().selectNode('L', 'dbb')
    s().askConfirm({ kind: 'reverseLink', id: 'e8' })
    server.use(
      http.post('*/api/links/:id/reverse', () =>
        HttpResponse.json({ code: 409, data: null, message: 'This relation already exists' }, { status: 409 }),
      ),
    )
    await s().runConfirm()
    expect(s().notice?.text).toBe('This relation already exists')
  })
})

describe('runConfirm — deleteLink', () => {
  it('removes the relation and refreshes', async () => {
    await s().selectNode('L', 'dbb')
    const before = s().links.length
    s().askConfirm({ kind: 'deleteLink', id: 'e8' })
    await s().runConfirm()
    expect(s().links).toHaveLength(before - 1)
  })
})

describe('runConfirm — deleteNode', () => {
  it('empties the other panel when the deleted node was its center', async () => {
    useKgStore.setState({ startId: 'a101', endId: 'dbb' })
    await s().refreshAll()
    s().askConfirm({ kind: 'deleteNode', id: 'dbb' })
    await s().runConfirm()
    expect(s().endId).toBeNull()
    expect(s().rightSub).toBeNull()
  })

  it('does not silently jump the panel to some unrelated node', async () => {
    useKgStore.setState({ endId: 'dbb' })
    s().askConfirm({ kind: 'deleteNode', id: 'dbb' })
    await s().runConfirm()
    expect(s().endId).toBeNull()
    expect(s().qEnd).toBe('')
  })

  it('clears the selection when the selected node is the one deleted', async () => {
    await s().selectNode('L', 'dbb')
    s().askConfirm({ kind: 'deleteNode', id: 'dbb' })
    await s().runConfirm()
    expect(s().sel).toBeNull()
  })
})

describe('toggleStartEndLink', () => {
  it('refuses when start and end are the same node', async () => {
    useKgStore.setState({ startId: 'a101', endId: 'a101' })
    await s().toggleStartEndLink()
    expect(s().editor).toBeNull()
  })

  it('opens a blank relation editor when no relation exists yet', async () => {
    useKgStore.setState({
      startId: 'a101',
      endId: 'obj',
      path: { found: false, segments: [], directLinks: [] },
    })
    await s().toggleStartEndLink()
    expect(s().editor?.kind).toBe('link')
    expect(s().editor?.id).toBeNull()
  })

  it('creates the relation when the blank editor is saved', async () => {
    useKgStore.setState({
      startId: 'a101',
      endId: 'obj',
      path: { found: false, segments: [], directLinks: [] },
    })
    await s().toggleStartEndLink()
    s().setDraft({ label: 'audits' })
    await s().saveEditor()
    expect(s().path?.directLinks).toHaveLength(1)
  })
})

describe('loadTaxonomy', () => {
  it('supplies candidates for the editor dropdowns', async () => {
    await s().loadTaxonomy()
    expect(s().taxonomy?.domains).toContain('Data Stores')
  })
})
