import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { server, resetDb } from '@/mocks/node'
import { useKgStore } from '../useKgStore'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetDb()
})
afterAll(() => server.close())
beforeEach(() => useKgStore.setState(useKgStore.getInitialState(), true))

const s = () => useKgStore.getState()

describe('setQuery', () => {
  it('opens the picker for the side being typed in', async () => {
    await s().setQuery('L', 'data')
    expect(s().openSide).toBe('L')
  })

  it('loads the tree for that side only', async () => {
    await s().setQuery('L', 'database')
    expect(s().treeL.length).toBeGreaterThan(0)
    expect(s().treeR).toEqual([])
  })

  it('stores the raw text so the input stays controlled', async () => {
    await s().setQuery('L', 'data')
    expect(s().qStart).toBe('data')
  })

  it('clears a stale hint once the user types again', async () => {
    useKgStore.setState({ hint: 'No node matched "zzz"' })
    await s().setQuery('L', 'd')
    expect(s().hint).toBe('')
  })

  it('resets the highlight when the result set changes', async () => {
    useKgStore.setState({ hlId: 'dbb' })
    await s().setQuery('L', 'log')
    expect(s().hlId).toBeNull()
  })
})

describe('runSearch', () => {
  it('prefers an exact label match', async () => {
    useKgStore.setState({ qStart: 'Database B' })
    await s().runSearch('L')
    expect(s().startId).toBe('dbb')
  })

  it('is case insensitive on the exact match', async () => {
    useKgStore.setState({ qStart: 'database b' })
    await s().runSearch('L')
    expect(s().startId).toBe('dbb')
  })

  it('falls back to a fuzzy match when nothing matches exactly', async () => {
    useKgStore.setState({ qStart: 'datab' })
    await s().runSearch('L')
    expect(s().startId).toBe('dbb')
  })

  it('sets a hint and changes nothing when there is no match', async () => {
    useKgStore.setState({ qStart: 'zzzzz' })
    await s().runSearch('L')
    expect(s().startId).toBeNull()
    expect(s().hint).toContain('zzzzz')
  })

  it('does nothing on an empty query', async () => {
    useKgStore.setState({ qStart: '   ' })
    await s().runSearch('L')
    expect(s().hint).toBe('')
    expect(s().startId).toBeNull()
  })
})

describe('pickNode', () => {
  it('centers the side, fills the input and closes the panel', async () => {
    await s().pickNode('L', 'dbb')
    expect(s().startId).toBe('dbb')
    expect(s().qStart).toBe('Database B')
    expect(s().openSide).toBeNull()
  })

  it('fills the right-hand input when picking on the end side', async () => {
    await s().pickNode('R', 'a101')
    expect(s().endId).toBe('a101')
    expect(s().qEnd).toBe('A101 System')
  })
})

describe('moveHighlight', () => {
  it('walks only leaf rows, skipping group headers', async () => {
    await s().setQuery('L', '')
    s().moveHighlight('L', 1)
    expect(s().leafIds('L')).toContain(s().hlId)
  })

  it('wraps around at the end of the list', async () => {
    await s().setQuery('L', '')
    const ids = s().leafIds('L')
    useKgStore.setState({ hlId: ids.at(-1) })
    s().moveHighlight('L', 1)
    expect(s().hlId).toBe(ids[0])
  })

  it('wraps backwards from the first row to the last', async () => {
    await s().setQuery('L', '')
    const ids = s().leafIds('L')
    useKgStore.setState({ hlId: ids[0] })
    s().moveHighlight('L', -1)
    expect(s().hlId).toBe(ids.at(-1))
  })

  it('does nothing when the tree is empty', async () => {
    await s().setQuery('L', 'zzzzz')
    s().moveHighlight('L', 1)
    expect(s().hlId).toBeNull()
  })
})

describe('closePicker', () => {
  it('drops both the open panel and the highlight', async () => {
    await s().setQuery('L', 'data')
    s().closePicker()
    expect(s().openSide).toBeNull()
    expect(s().hlId).toBeNull()
  })
})
