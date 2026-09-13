import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, screen } from '@testing-library/react'
import { renderWith } from '@/test/renderWith'
import { useKgStore } from '@/stores/useKgStore'
import { BlockingOverlay } from '../BlockingOverlay'

beforeEach(() => useKgStore.setState(useKgStore.getInitialState(), true))
afterEach(() => vi.useRealTimers())

describe('BlockingOverlay', () => {
  it('stays hidden when nothing is in flight', () => {
    renderWith(<BlockingOverlay />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('stays hidden for a fast mutation so the screen does not flash', () => {
    vi.useFakeTimers()
    useKgStore.setState({ blocking: true })
    renderWith(<BlockingOverlay />)
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('appears once the mutation is slow enough to be worth reporting', () => {
    vi.useFakeTimers()
    useKgStore.setState({ blocking: true })
    renderWith(<BlockingOverlay />)
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('marks itself busy for assistive tech', () => {
    vi.useFakeTimers()
    useKgStore.setState({ blocking: true })
    renderWith(<BlockingOverlay />)
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.getByRole('alert')).toHaveAttribute('aria-busy', 'true')
  })

  it('disappears as soon as the mutation settles', () => {
    vi.useFakeTimers()
    useKgStore.setState({ blocking: true })
    renderWith(<BlockingOverlay />)
    act(() => {
      vi.advanceTimersByTime(300)
    })
    act(() => {
      useKgStore.setState({ blocking: false })
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('swallows Escape while blocking — the request cannot be recalled', () => {
    vi.useFakeTimers()
    useKgStore.setState({ blocking: true })
    renderWith(<BlockingOverlay />)
    act(() => {
      vi.advanceTimersByTime(300)
    })
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true, bubbles: true })
    act(() => {
      window.dispatchEvent(event)
    })
    expect(event.defaultPrevented).toBe(true)
  })
})
