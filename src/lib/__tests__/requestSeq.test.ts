import { describe, it, expect } from 'vitest'
import { createSeq } from '../requestSeq'

describe('createSeq', () => {
  it('hands out increasing numbers per key', () => {
    const s = createSeq()
    expect(s.next('a')).toBe(1)
    expect(s.next('a')).toBe(2)
  })

  it('keeps counters independent per key', () => {
    const s = createSeq()
    s.next('a')
    s.next('a')
    expect(s.next('b')).toBe(1)
  })

  it('recognises only the most recent ticket as current', () => {
    const s = createSeq()
    const stale = s.next('a')
    const fresh = s.next('a')
    expect(s.isCurrent('a', stale)).toBe(false)
    expect(s.isCurrent('a', fresh)).toBe(true)
  })

  it('treats a ticket for an untouched key as not current', () => {
    expect(createSeq().isCurrent('never', 1)).toBe(false)
  })
})
