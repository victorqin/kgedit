import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server, resetDb } from '@/mocks/node'
import { renderWith } from '@/test/renderWith'
import { useKgStore } from '@/stores/useKgStore'
import { NodeEditModal } from '../NodeEditModal'
import type { GraphPayload } from '@/api/types'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetDb()
})
afterAll(() => server.close())
beforeEach(() => useKgStore.setState(useKgStore.getInitialState(), true))

const sub: GraphPayload = {
  nodes: [
    { id: 'dbb', label: 'Database B', type: 'Relational DB', domain: 'Data Stores', desc: 'Primary' },
  ],
  edges: [],
  meta: { centerId: 'dbb', hops: 2, truncated: false, nodeCap: 200, totalNodes: 1 },
}

const openEditor = async (id: string | null = 'dbb') => {
  useKgStore.setState({ leftSub: sub, startId: 'dbb' })
  useKgStore.getState().openNodeEditor(id, 'L')
  await waitFor(() => expect(useKgStore.getState().taxonomy).not.toBeNull())
}

describe('NodeEditModal', () => {
  it('offers all four fields including the domain the design canvas lacked', async () => {
    await openEditor()
    renderWith(<NodeEditModal />)
    for (const label of ['TITLE', 'TYPE', 'DOMAIN', 'DESCRIPTION']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
  })

  it('prefills from the existing node', async () => {
    await openEditor()
    renderWith(<NodeEditModal />)
    expect(screen.getByLabelText('TITLE')).toHaveValue('Database B')
    expect(screen.getByLabelText('DOMAIN')).toHaveValue('Data Stores')
  })

  it('starts blank when creating', async () => {
    await openEditor(null)
    renderWith(<NodeEditModal />)
    expect(screen.getByLabelText('TITLE')).toHaveValue('')
    expect(screen.getByText('New node')).toBeInTheDocument()
  })

  it('suggests existing domains rather than making the user guess', async () => {
    await openEditor()
    renderWith(<NodeEditModal />)
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    await user.clear(screen.getByLabelText('DOMAIN'))
    await user.type(screen.getByLabelText('DOMAIN'), 'Data')
    expect(await screen.findByTitle('Data Stores')).toBeInTheDocument()
  })

  it('accepts a brand new domain that is not in the candidate list', async () => {
    await openEditor()
    renderWith(<NodeEditModal />)
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    await user.clear(screen.getByLabelText('DOMAIN'))
    await user.type(screen.getByLabelText('DOMAIN'), 'Streaming')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(useKgStore.getState().editor).toBeNull())
  })

  it('blocks saving without a title', async () => {
    await openEditor(null)
    renderWith(<NodeEditModal />)
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('warns before discarding unsaved edits', async () => {
    await openEditor()
    renderWith(<NodeEditModal />)
    await userEvent.type(screen.getByLabelText('TITLE'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(await screen.findByText(/Discard unsaved changes/)).toBeInTheDocument()
    expect(useKgStore.getState().editor).not.toBeNull()
  })

  it('closes without warning when nothing was touched', async () => {
    await openEditor()
    renderWith(<NodeEditModal />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(useKgStore.getState().editor).toBeNull()
  })

  it('routes node deletion through confirmation', async () => {
    await openEditor()
    renderWith(<NodeEditModal />)
    await userEvent.click(screen.getByRole('button', { name: /Delete node/ }))
    expect(useKgStore.getState().confirm).toMatchObject({ kind: 'deleteNode', id: 'dbb' })
  })

  it('shows a server validation message inline and keeps the editor open', async () => {
    server.use(
      http.patch('*/api/nodes/:id', () =>
        HttpResponse.json({ code: 422, data: null, message: 'Label required' }, { status: 422 }),
      ),
    )
    await openEditor()
    renderWith(<NodeEditModal />)
    await userEvent.type(screen.getByLabelText('TITLE'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Label required')).toBeInTheDocument()
    expect(useKgStore.getState().editor).not.toBeNull()
  })
})
