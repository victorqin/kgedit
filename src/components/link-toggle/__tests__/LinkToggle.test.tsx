import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWith } from '@/test/renderWith'
import { useKgStore } from '@/stores/useKgStore'
import { LinkToggle } from '../LinkToggle'
import type { LinkDetail } from '@/api/types'

beforeEach(() => useKgStore.setState(useKgStore.getInitialState(), true))

const link = (id: string, label: string): LinkDetail => ({
  id,
  source: { id: 'a101', label: 'A101 System' },
  target: { id: 'dbb', label: 'Database B' },
  label,
  predicate: label,
  directed: true,
  createdAt: '',
  updatedAt: '',
})

const setup = (directLinks: LinkDetail[], ids = { startId: 'a101', endId: 'dbb' }) =>
  useKgStore.setState({ ...ids, path: { found: true, segments: [], directLinks } })

describe('LinkToggle', () => {
  it('invites a join when no relation exists', () => {
    setup([])
    renderWith(<LinkToggle />)
    expect(screen.getByText('NOT LINKED — CLICK TO JOIN')).toBeInTheDocument()
  })

  it('reports the singular state for exactly one relation', () => {
    setup([link('e1', 'reads')])
    renderWith(<LinkToggle />)
    expect(screen.getByText('LINKED — CLICK TO CUT')).toBeInTheDocument()
  })

  it('reports the count when several relations exist', () => {
    setup([link('e1', 'reads'), link('e2', 'writes')])
    renderWith(<LinkToggle />)
    expect(screen.getByText('2 RELATIONS — CLICK TO CUT')).toBeInTheDocument()
  })

  it('lists each relation to choose from when cutting, since parallel edges are allowed', async () => {
    setup([link('e1', 'reads'), link('e2', 'writes')])
    renderWith(<LinkToggle />)
    await userEvent.click(screen.getByRole('button'))
    expect(await screen.findByText('reads')).toBeInTheDocument()
    expect(screen.getByText('writes')).toBeInTheDocument()
  })

  it('routes a cut through confirmation rather than deleting straight away', async () => {
    setup([link('e1', 'reads')])
    renderWith(<LinkToggle />)
    // AntD Popover 入场动画期间内容是 pointer-events:none，这里不检查指针可达性
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    await user.click(screen.getByRole('button', { name: /linked/i }))
    await user.click(await screen.findByRole('button', { name: 'Cut' }))
    expect(useKgStore.getState().confirm).toEqual({ kind: 'deleteLink', id: 'e1' })
  })

  it('opens a blank relation editor when joining', async () => {
    setup([])
    renderWith(<LinkToggle />)
    await userEvent.click(screen.getByRole('button'))
    expect(useKgStore.getState().editor?.kind).toBe('link')
    expect(useKgStore.getState().editor?.id).toBeNull()
  })

  it('is disabled when start and end are the same node', () => {
    setup([], { startId: 'a101', endId: 'a101' })
    renderWith(<LinkToggle />)
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByText('Start and End are the same node')).toBeInTheDocument()
  })

  it('is disabled before both endpoints are chosen', () => {
    renderWith(<LinkToggle />)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
