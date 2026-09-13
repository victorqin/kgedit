import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server, resetDb } from '@/mocks/node'
import { renderWith } from '@/test/renderWith'
import { useKgStore } from '@/stores/useKgStore'
import { NodePicker } from '../NodePicker'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetDb()
})
afterAll(() => server.close())
beforeEach(() => useKgStore.setState(useKgStore.getInitialState(), true))

describe('NodePicker', () => {
  it('opens the tree panel on focus', async () => {
    renderWith(<NodePicker side="L" />)
    await userEvent.click(screen.getByRole('combobox'))
    expect(await screen.findByRole('tree')).toBeInTheDocument()
  })

  it('reflects open state to assistive tech', async () => {
    renderWith(<NodePicker side="L" />)
    const input = screen.getByRole('combobox')
    expect(input).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(input)
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'true'))
  })

  it('debounces typing into a single tree request', async () => {
    let calls = 0
    server.use(
      http.get('*/api/nodes/tree', () => {
        calls += 1
        return HttpResponse.json({ code: 0, data: { total: 0, tree: [] }, message: '' })
      }),
    )
    renderWith(<NodePicker side="L" />)
    const input = screen.getByRole('combobox')
    await userEvent.click(input) // focus 本身会拉一次
    const afterFocus = calls
    await userEvent.type(input, 'data')
    await waitFor(() => expect(calls).toBe(afterFocus + 1), { timeout: 2000 })
  })

  it('shows the empty message when nothing matches', async () => {
    renderWith(<NodePicker side="L" />)
    await userEvent.type(screen.getByRole('combobox'), 'zzzzz')
    expect(await screen.findByText('No node matches')).toBeInTheDocument()
  })

  it('picks a leaf by clicking it and closes the panel', async () => {
    renderWith(<NodePicker side="L" />)
    await userEvent.type(screen.getByRole('combobox'), 'database')
    await userEvent.click(await screen.findByText('Database B'))
    await waitFor(() => expect(useKgStore.getState().startId).toBe('dbb'))
  })

  it('picks the highlighted leaf with ArrowDown then Enter', async () => {
    renderWith(<NodePicker side="L" />)
    const input = screen.getByRole('combobox')
    await userEvent.type(input, 'database')
    // 等防抖后的过滤结果真正落到 store，否则方向键走的还是未过滤的那棵树
    await waitFor(() => expect(useKgStore.getState().leafIds('L')).toEqual(['dbb']))
    await userEvent.type(input, '{ArrowDown}{Enter}')
    await waitFor(() => expect(useKgStore.getState().startId).toBe('dbb'))
  })

  it('closes on Escape without selecting anything', async () => {
    renderWith(<NodePicker side="L" />)
    const input = screen.getByRole('combobox')
    await userEvent.type(input, 'database')
    await screen.findByText('Database B')
    await userEvent.type(input, '{Escape}')
    expect(useKgStore.getState().startId).toBeNull()
    await waitFor(() => expect(screen.queryByRole('tree')).not.toBeInTheDocument())
  })

  it('surfaces the no-match hint when the Search button finds nothing', async () => {
    renderWith(<NodePicker side="L" />)
    await userEvent.type(screen.getByRole('combobox'), 'zzzzz')
    await userEvent.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() =>
      expect(useKgStore.getState().hint).toBe('No node matched "zzzzz"'),
    )
  })

  it('resolves an exact label through the Search button', async () => {
    renderWith(<NodePicker side="R" />)
    await userEvent.type(screen.getByRole('combobox'), 'Database B')
    await userEvent.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() => expect(useKgStore.getState().endId).toBe('dbb'))
  })

  it('uses the side accent placeholder text', () => {
    renderWith(<NodePicker side="R" />)
    expect(screen.getByPlaceholderText('End node — click to browse')).toBeInTheDocument()
  })
})
