import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWith } from '@/test/renderWith'
import { useKgStore } from '@/stores/useKgStore'
import { RelationList } from '../RelationList'
import type { GraphPayload, LinkDetail } from '@/api/types'

beforeEach(() => useKgStore.setState(useKgStore.getInitialState(), true))

const link = (id: string, label = 'stores'): LinkDetail => ({
  id,
  source: { id: 'gwd', label: 'Gateway D' },
  target: { id: 'dbb', label: 'Database B' },
  label,
  predicate: label,
  directed: true,
  createdAt: '',
  updatedAt: '',
})

const sub: GraphPayload = {
  nodes: [{ id: 'dbb', label: 'Database B', type: 'T', domain: 'D', desc: '' }],
  edges: [],
  meta: { centerId: 'dbb', hops: 2, truncated: false, nodeCap: 200, totalNodes: 1 },
}

const nodeSel = { side: 'L', kind: 'node', id: 'dbb' } as const

describe('RelationList', () => {
  it('shows the two-line hint when nothing is selected', () => {
    renderWith(<RelationList />)
    expect(
      screen.getByText(/Left-click a node to list all of its relations/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Double-click a node to re-center/)).toBeInTheDocument()
  })

  it('captions a node selection with its relation count', () => {
    useKgStore.setState({ sel: nodeSel, links: [link('e1'), link('e2'), link('e3')], leftSub: sub })
    renderWith(<RelationList />)
    expect(screen.getByText('SELECTED NODE [Database B] · 3 RELATION(S)')).toBeInTheDocument()
  })

  it('captions a single edge selection differently', () => {
    useKgStore.setState({ sel: { side: 'L', kind: 'edge', id: 'e1' }, links: [link('e1')] })
    renderWith(<RelationList />)
    expect(screen.getByText('SELECTED LINK · 1 RELATION')).toBeInTheDocument()
  })

  it('numbers rows from 01', () => {
    useKgStore.setState({ sel: nodeSel, links: [link('e1'), link('e2')], leftSub: sub })
    renderWith(<RelationList />)
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('02')).toBeInTheDocument()
  })

  it('tints an endpoint that is the current start node', () => {
    useKgStore.setState({ sel: nodeSel, links: [link('e1')], leftSub: sub, startId: 'gwd' })
    renderWith(<RelationList />)
    expect(screen.getByText('[Gateway D]')).toHaveClass('relation-row__endpoint--start')
  })

  it('tints an endpoint that is the current end node', () => {
    useKgStore.setState({ sel: nodeSel, links: [link('e1')], leftSub: sub, endId: 'dbb' })
    renderWith(<RelationList />)
    expect(screen.getByText('[Database B]')).toHaveClass('relation-row__endpoint--end')
  })

  it('asks for confirmation before reversing rather than acting immediately', async () => {
    useKgStore.setState({ sel: nodeSel, links: [link('e1')], leftSub: sub })
    renderWith(<RelationList />)
    await userEvent.click(screen.getByRole('button', { name: /^Reverse/ }))
    expect(useKgStore.getState().confirm).toEqual({ kind: 'reverseLink', id: 'e1' })
  })

  it('asks for confirmation before deleting', async () => {
    useKgStore.setState({ sel: nodeSel, links: [link('e1')], leftSub: sub })
    renderWith(<RelationList />)
    await userEvent.click(screen.getByRole('button', { name: /^Delete/ }))
    expect(useKgStore.getState().confirm).toEqual({ kind: 'deleteLink', id: 'e1' })
  })

  it('opens the relation editor from Edit', async () => {
    useKgStore.setState({ sel: nodeSel, links: [link('e1')], leftSub: sub })
    renderWith(<RelationList />)
    await userEvent.click(screen.getByRole('button', { name: /^Edit/ }))
    expect(useKgStore.getState().editor).toMatchObject({ kind: 'link', id: 'e1' })
  })

  it('keeps every row action reachable by keyboard — the graph itself is not', async () => {
    useKgStore.setState({ sel: nodeSel, links: [link('e1')], leftSub: sub })
    renderWith(<RelationList />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
    for (const b of buttons) {
      b.focus()
      expect(document.activeElement).toBe(b)
    }
  })

  it('says so when a selected node simply has no relations', () => {
    useKgStore.setState({ sel: nodeSel, links: [], leftSub: sub })
    renderWith(<RelationList />)
    expect(screen.getByText('This node has no relations yet')).toBeInTheDocument()
  })
})
