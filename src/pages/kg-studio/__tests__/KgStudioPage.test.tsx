import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import { server, resetDb } from '@/mocks/node'
import { renderWith } from '@/test/renderWith'
import { useKgStore } from '@/stores/useKgStore'
import KgStudioPage from '../KgStudioPage'

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
beforeEach(() => {
  useKgStore.setState(useKgStore.getInitialState(), true)
  window.history.replaceState(null, '', '/kg')
})

const renderAt = (search: string) => {
  window.history.replaceState(null, '', `/kg${search}`)
  return renderWith(<KgStudioPage />, { route: `/kg${search}` })
}

describe('KgStudioPage', () => {
  it('hydrates start, end and hops from the url on mount', async () => {
    renderAt('?start=a101&end=dbb&hops=3')
    await waitFor(() => {
      const s = useKgStore.getState()
      expect(s.startId).toBe('a101')
      expect(s.endId).toBe('dbb')
      expect(s.hops).toBe(3)
    })
  })

  it('loads both subgraphs and the path from the url state', async () => {
    renderAt('?start=a101&end=dbb&hops=2')
    await waitFor(() => {
      expect(useKgStore.getState().leftSub?.meta.centerId).toBe('a101')
      expect(useKgStore.getState().rightSub?.meta.centerId).toBe('dbb')
      expect(useKgStore.getState().path?.found).toBe(true)
    })
  })

  it('writes the center back to the url so the view is shareable', async () => {
    renderAt('?start=a101&end=dbb&hops=2')
    await waitFor(() => expect(useKgStore.getState().leftSub).not.toBeNull())
    await act(async () => {
      await useKgStore.getState().setCenter('L', 'gwd')
    })
    await waitFor(() => expect(window.location.search).toContain('start=gwd'))
  })

  it('renders both panels and the relation bar', async () => {
    renderAt('?start=a101&end=dbb')
    expect(await screen.findByText('START-CENTRIC SUBGRAPH')).toBeInTheDocument()
    expect(screen.getByText('END-CENTRIC SUBGRAPH')).toBeInTheDocument()
    expect(screen.getByText('RELATION EDITOR / ACTION BAR')).toBeInTheDocument()
    expect(screen.getByText('PATH STATUS')).toBeInTheDocument()
  })

  it('offers a search box for each side', async () => {
    renderAt('?start=a101&end=dbb')
    expect(await screen.findByPlaceholderText('Start node — click to browse')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('End node — click to browse')).toBeInTheDocument()
  })

  it('empties a panel rather than jumping elsewhere when its center is deleted', async () => {
    renderAt('?start=a101&end=dbb')
    await waitFor(() => expect(useKgStore.getState().rightSub).not.toBeNull())
    await act(async () => {
      useKgStore.getState().askConfirm({ kind: 'deleteNode', id: 'dbb' })
      await useKgStore.getState().runConfirm()
    })
    expect(useKgStore.getState().endId).toBeNull()
    expect(useKgStore.getState().rightSub).toBeNull()
  })

  it('surfaces the no-match hint inline', async () => {
    renderAt('?start=a101&end=dbb')
    await act(async () => {
      useKgStore.setState({ hint: 'No node matched "zzzzz"' })
    })
    expect(await screen.findByText('No node matched "zzzzz"')).toBeInTheDocument()
  })
})
