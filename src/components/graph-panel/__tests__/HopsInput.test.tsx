import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWith } from '@/test/renderWith'
import { HopsInput } from '../HopsInput'

const onChange = vi.fn()
beforeEach(() => onChange.mockClear())

const type = async (text: string) => {
  const input = screen.getByRole('spinbutton')
  await userEvent.clear(input)
  await userEvent.type(input, text)
  await userEvent.tab()
  return input
}

describe('HopsInput', () => {
  it('accepts a positive integer', async () => {
    renderWith(<HopsInput value={2} onChange={onChange} />)
    await type('7')
    expect(onChange).toHaveBeenLastCalledWith(7)
  })

  it('clamps zero up to one on blur', async () => {
    renderWith(<HopsInput value={2} onChange={onChange} />)
    await type('0')
    expect(onChange).toHaveBeenLastCalledWith(1)
  })

  it('clamps a negative value up to one', async () => {
    renderWith(<HopsInput value={2} onChange={onChange} />)
    await type('-3')
    expect(onChange).toHaveBeenLastCalledWith(1)
  })

  it('has no upper bound — the server caps instead', async () => {
    renderWith(<HopsInput value={2} onChange={onChange} />)
    await type('42')
    expect(onChange).toHaveBeenLastCalledWith(42)
  })

  it('truncates a decimal to an integer', async () => {
    renderWith(<HopsInput value={2} onChange={onChange} />)
    await type('3.9')
    expect(onChange).toHaveBeenLastCalledWith(3)
  })

  it('rejects letters, leaving the previous value in place', async () => {
    renderWith(<HopsInput value={2} onChange={onChange} />)
    const input = screen.getByRole('spinbutton')
    await userEvent.type(input, 'abc')
    await userEvent.tab()
    expect(input).toHaveValue('2')
  })

  it('restores the last good value when emptied', async () => {
    renderWith(<HopsInput value={3} onChange={onChange} />)
    const input = screen.getByRole('spinbutton')
    await userEvent.clear(input)
    await userEvent.tab()
    expect(input).toHaveValue('3')
  })
})
