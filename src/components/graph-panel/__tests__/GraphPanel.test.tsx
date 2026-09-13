import { describe, it, expect, vi, beforeEach, beforeAll, afterAll, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server, resetDb } from '@/mocks/node'
import { renderWith } from '@/test/renderWith'
import { useKgStore } from '@/stores/useKgStore'
import { GraphPanel } from '../GraphPanel'
import type { GraphPayload } from '@/api/types'

// G6 需要 canvas，在 jsdom 里跑不起来；图的真实渲染交给 E2E 验证。
vi.mock('@antv/g6', () => ({
  Graph: class {
    setData() {}
    async render() {}
    destroy() {}
    async zoomTo() {}
    async focusElement() {}
    setElementState() {}
    on() {}
  },
}))

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetDb()
})
afterAll(() => server.close())
beforeEach(() => useKgStore.setState(useKgStore.getInitialState(), true))

const payload = (over: Partial<GraphPayload['meta']> = {}): GraphPayload => ({
  nodes: [{ id: 'a', label: 'A', type: 'T', domain: 'D', desc: '' }],
  edges: [],
  meta: { centerId: 'a', hops: 2, truncated: false, nodeCap: 200, totalNodes: 1, ...over },
})

describe('GraphPanel', () => {
  it('labels the panel by side', () => {
    renderWith(<GraphPanel side="R" />)
    expect(screen.getByText('END-CENTRIC SUBGRAPH')).toBeInTheDocument()
  })

  it('tells the user when the result was capped, with both numbers', () => {
    useKgStore.setState({ leftSub: payload({ truncated: true, nodeCap: 200, totalNodes: 1243 }) })
    renderWith(<GraphPanel side="L" />)
    expect(screen.getByRole('status')).toHaveTextContent('showing 1 of 1,243')
  })

  it('stays quiet when nothing was truncated', () => {
    useKgStore.setState({ leftSub: payload() })
    renderWith(<GraphPanel side="L" />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows a retry affordance when the side failed to load', async () => {
    useKgStore.setState({ startId: 'a101', error: { L: 'boom', R: null } })
    renderWith(<GraphPanel side="L" />)
    expect(screen.getByRole('alert')).toHaveTextContent('boom')
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(useKgStore.getState().leftSub?.meta.centerId).toBe('a101')
  })

  it('prompts the user to pick a node when the panel has no center', () => {
    renderWith(<GraphPanel side="L" />)
    expect(screen.getByText('No node selected for this panel')).toBeInTheDocument()
  })

  it('opens a blank editor from the plus button rather than creating immediately', async () => {
    renderWith(<GraphPanel side="L" />)
    await userEvent.click(screen.getByRole('button', { name: /new blank node/i }))
    const editor = useKgStore.getState().editor
    expect(editor?.kind).toBe('node')
    expect(editor?.id).toBeNull()
  })

  it('drives hops through the store, clamping invalid input', async () => {
    useKgStore.setState({ startId: 'a101' })
    renderWith(<GraphPanel side="L" />)
    const input = screen.getByRole('spinbutton')
    await userEvent.clear(input)
    await userEvent.type(input, '0')
    await userEvent.tab()
    expect(useKgStore.getState().hops).toBe(1)
  })
})
