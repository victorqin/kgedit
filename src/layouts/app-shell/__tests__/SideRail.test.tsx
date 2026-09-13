import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWith } from '@/test/renderWith'
import { SideRail } from '../SideRail'

describe('SideRail', () => {
  it('exposes a labelled navigation landmark', () => {
    renderWith(<SideRail />)
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
  })

  it('marks the knowledge graph entry current when on /kg', () => {
    renderWith(<SideRail />, { route: '/kg' })
    expect(screen.getByRole('link', { name: /knowledge graph/i })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('marks overview current when on /overview', () => {
    renderWith(<SideRail />, { route: '/overview' })
    expect(screen.getByRole('link', { name: /overview/i })).toHaveAttribute('aria-current', 'page')
  })

  it('marks only one entry current at a time', () => {
    renderWith(<SideRail />, { route: '/kg' })
    const current = screen.getAllByRole('link').filter((l) => l.getAttribute('aria-current'))
    expect(current).toHaveLength(1)
  })

  it('renders every destination as a keyboard reachable link', async () => {
    renderWith(<SideRail />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(5)
    await userEvent.tab()
    expect(links).toContain(document.activeElement)
  })
})
