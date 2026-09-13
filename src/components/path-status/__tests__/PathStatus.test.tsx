import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server, resetDb } from '@/mocks/node'
import { renderWith } from '@/test/renderWith'
import { useKgStore } from '@/stores/useKgStore'
import { PathStatus } from '../PathStatus'
import type { PathSegment } from '@/api/types'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetDb()
})
afterAll(() => server.close())
beforeEach(() => useKgStore.setState(useKgStore.getInitialState(), true))

const withPath = (segments: PathSegment[]) =>
  useKgStore.setState({
    startId: 'a',
    endId: 'b',
    path: { found: true, segments, directLinks: [] },
  })

describe('PathStatus', () => {
  it('renders a forward arrow for a forward segment', () => {
    withPath([
      { node: { id: 'a', label: 'A' } },
      { node: { id: 'b', label: 'B' }, edge: { id: 'e', label: 'stores', reversed: false } },
    ])
    renderWith(<PathStatus />)
    expect(screen.getByText('──(stores)──▶')).toBeInTheDocument()
  })

  it('flips the arrow for a reversed segment so it stops lying about direction', () => {
    withPath([
      { node: { id: 'a', label: 'A' } },
      { node: { id: 'b', label: 'B' }, edge: { id: 'e', label: 'stores', reversed: true } },
    ])
    renderWith(<PathStatus />)
    expect(screen.getByText('◀──(stores)──')).toBeInTheDocument()
    expect(screen.queryByText('──(stores)──▶')).not.toBeInTheDocument()
  })

  it('tints the two endpoints with their side accents', () => {
    withPath([{ node: { id: 'a', label: 'A' } }, { node: { id: 'b', label: 'B' } }])
    renderWith(<PathStatus />)
    expect(screen.getByText('[A]')).toHaveClass('path-status__node--start')
    expect(screen.getByText('[B]')).toHaveClass('path-status__node--end')
  })

  it('shows the no-path message with both endpoint labels', () => {
    useKgStore.setState({
      startId: 'a101',
      endId: 'obj',
      qStart: 'A101 System',
      qEnd: 'Object Store',
      path: { found: false, segments: [], directLinks: [] },
    })
    renderWith(<PathStatus />)
    expect(
      screen.getByText('No path found between [A101 System] and [Object Store]'),
    ).toBeInTheDocument()
  })

  it('prompts for endpoints before either is chosen', () => {
    renderWith(<PathStatus />)
    expect(screen.getByText('Pick a start and an end node to trace a path')).toBeInTheDocument()
  })

  it('re-centers the start panel on left click', async () => {
    withPath([{ node: { id: 'dbb', label: 'Database B' } }])
    renderWith(<PathStatus />)
    await userEvent.click(screen.getByText('[Database B]'))
    await waitFor(() => expect(useKgStore.getState().startId).toBe('dbb'))
  })

  it('exposes each hop as a real button so the path is keyboard reachable', () => {
    withPath([{ node: { id: 'a', label: 'A' } }, { node: { id: 'b', label: 'B' } }])
    renderWith(<PathStatus />)
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })
})
