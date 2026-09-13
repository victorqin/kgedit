import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { server, resetDb } from '@/mocks/node'
import { renderWith } from '@/test/renderWith'
import { useKgStore } from '@/stores/useKgStore'
import { ConfirmDialog } from '../ConfirmDialog'
import type { LinkDetail } from '@/api/types'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetDb()
})
afterAll(() => server.close())
beforeEach(() => useKgStore.setState(useKgStore.getInitialState(), true))

const link: LinkDetail = {
  id: 'e8',
  source: { id: 'gwd', label: 'Gateway D' },
  target: { id: 'dbb', label: 'Database B' },
  label: 'stores',
  predicate: 'stores',
  directed: true,
  createdAt: '',
  updatedAt: '',
}

describe('ConfirmDialog', () => {
  it('spells out the before and after when reversing, not just a yes/no', () => {
    useKgStore.setState({ links: [link], confirm: { kind: 'reverseLink', id: 'e8' } })
    renderWith(<ConfirmDialog />)
    const box = screen.getByText(/Now/).textContent ?? ''
    expect(box).toContain('Now    [Gateway D] ──stores──▶ [Database B]')
    expect(box).toContain('After  [Database B] ──stores──▶ [Gateway D]')
  })

  it('uses a non-destructive confirm label for a reversal', () => {
    useKgStore.setState({ links: [link], confirm: { kind: 'reverseLink', id: 'e8' } })
    renderWith(<ConfirmDialog />)
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
  })

  it('names the relation being deleted', () => {
    useKgStore.setState({ links: [link], confirm: { kind: 'deleteLink', id: 'e8' } })
    renderWith(<ConfirmDialog />)
    expect(screen.getByText('[Gateway D] ──stores──▶ [Database B]')).toBeInTheDocument()
  })

  it('states how many relations a node deletion will take with it', async () => {
    useKgStore.setState({ confirm: { kind: 'deleteNode', id: 'dbb' } })
    renderWith(<ConfirmDialog />)
    // count 未给出时会去查一次；dbb 有 4 条关系
    await waitFor(() =>
      expect(screen.getByText(/removes the node and all 4 relation\(s\)/)).toBeInTheDocument(),
    )
  })

  it('warns that deletion cannot be undone', () => {
    useKgStore.setState({ links: [link], confirm: { kind: 'deleteLink', id: 'e8' } })
    renderWith(<ConfirmDialog />)
    expect(screen.getByText(/cannot be undone/)).toBeInTheDocument()
  })

  it('renders nothing when no confirmation is pending', () => {
    renderWith(<ConfirmDialog />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('presents itself as a modal dialog to assistive tech', () => {
    // 真正的焦点陷阱在 jsdom 里验证不了：rc-dialog 的移焦依赖过渡事件，
    // jsdom 从不触发，焦点会停在 body。真实焦点行为由 e2e/kg-studio.spec.ts 覆盖。
    useKgStore.setState({ links: [link], confirm: { kind: 'deleteLink', id: 'e8' } })
    renderWith(<ConfirmDialog />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })
})
