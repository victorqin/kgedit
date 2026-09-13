import { describe, it, expect } from 'vitest'
import { readStateFromUrl, writeStateToUrl } from '../urlSync'

describe('readStateFromUrl', () => {
  it('reads all three view parameters', () => {
    expect(readStateFromUrl('?start=a101&end=dbb&hops=3')).toEqual({
      start: 'a101',
      end: 'dbb',
      hops: 3,
    })
  })

  it('ignores a non-integer hops instead of crashing', () => {
    expect(readStateFromUrl('?hops=abc').hops).toBeUndefined()
  })

  it('clamps a hops below 1', () => {
    expect(readStateFromUrl('?hops=0').hops).toBe(1)
    expect(readStateFromUrl('?hops=-4').hops).toBe(1)
  })

  it('truncates a fractional hops', () => {
    expect(readStateFromUrl('?hops=3.8').hops).toBe(3)
  })

  it('accepts a large hops — there is no upper bound on the client', () => {
    expect(readStateFromUrl('?hops=42').hops).toBe(42)
  })

  it('returns an empty object for a bare url', () => {
    expect(readStateFromUrl('')).toEqual({})
  })

  it('ignores blank parameters', () => {
    expect(readStateFromUrl('?start=&end=')).toEqual({})
  })
})

describe('writeStateToUrl', () => {
  it('omits empty centers so the url stays clean', () => {
    expect(writeStateToUrl({ startId: null, endId: null, hops: 2 })).toBe('?hops=2')
  })

  it('includes both centers when set', () => {
    expect(writeStateToUrl({ startId: 'a101', endId: 'dbb', hops: 2 })).toBe(
      '?start=a101&end=dbb&hops=2',
    )
  })

  it('round-trips through read', () => {
    const q = writeStateToUrl({ startId: 'a101', endId: 'dbb', hops: 3 })
    expect(readStateFromUrl(q)).toEqual({ start: 'a101', end: 'dbb', hops: 3 })
  })

  it('encodes ids that need escaping', () => {
    const q = writeStateToUrl({ startId: 'a b&c', endId: null, hops: 1 })
    expect(readStateFromUrl(q).start).toBe('a b&c')
  })
})
