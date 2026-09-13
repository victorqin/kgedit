import { describe, it, expect, afterEach } from 'vitest'
import { resolveBaseUrl, unwrapEnvelope, normalizeError, ApiError } from '../client'
import { ERR } from '../types'

describe('resolveBaseUrl', () => {
  afterEach(() => {
    delete window.__APP_CONFIG__
  })

  it('prefers the runtime override so one build serves many environments', () => {
    window.__APP_CONFIG__ = { apiBaseUrl: 'https://prod.example.com/api' }
    expect(resolveBaseUrl()).toBe('https://prod.example.com/api')
  })

  it('trims whitespace from the runtime override', () => {
    window.__APP_CONFIG__ = { apiBaseUrl: '  https://x.example.com/api  ' }
    expect(resolveBaseUrl()).toBe('https://x.example.com/api')
  })

  it('falls back to the build-time value when the runtime override is blank', () => {
    window.__APP_CONFIG__ = { apiBaseUrl: '' }
    expect(resolveBaseUrl()).toBe(import.meta.env.VITE_API_BASE_URL)
  })

  it('falls back when config.js never loaded at all', () => {
    expect(resolveBaseUrl()).toBe(import.meta.env.VITE_API_BASE_URL)
  })
})

describe('unwrapEnvelope', () => {
  it('returns data when code is 0', () => {
    expect(unwrapEnvelope({ code: 0, data: { id: 'a' }, message: '' })).toEqual({ id: 'a' })
  })

  it('returns falsy payloads untouched rather than treating them as failure', () => {
    expect(unwrapEnvelope({ code: 0, data: 0, message: '' })).toBe(0)
    expect(unwrapEnvelope({ code: 0, data: null, message: '' })).toBeNull()
  })

  it('throws ApiError when code is non-zero', () => {
    expect(() => unwrapEnvelope({ code: 422, data: null, message: 'self loop' })).toThrow(ApiError)
  })

  it('preserves the business code so callers can branch on it', () => {
    try {
      unwrapEnvelope({ code: ERR.DUPLICATE, data: null, message: 'duplicate' })
      expect.unreachable('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).code).toBe(ERR.DUPLICATE)
      expect((e as ApiError).message).toBe('duplicate')
    }
  })

  it('supplies a message when the server sent none', () => {
    try {
      unwrapEnvelope({ code: 500, data: null, message: '' })
      expect.unreachable('should have thrown')
    } catch (e) {
      expect((e as ApiError).message).toBeTruthy()
    }
  })
})

describe('normalizeError', () => {
  it('prefers the business code from the response body over the http status', () => {
    const err = normalizeError({
      message: 'Request failed',
      response: { status: 400, data: { code: ERR.SELF_LOOP, data: null, message: 'no self loop' } },
    })
    expect(err.code).toBe(ERR.SELF_LOOP)
    expect(err.message).toBe('no self loop')
    expect(err.status).toBe(400)
  })

  it('falls back to the http status when there is no envelope', () => {
    const err = normalizeError({ message: 'Bad Gateway', response: { status: 502, data: '<html>' } })
    expect(err.code).toBe(502)
  })

  it('reports a transport failure with no response as code 0', () => {
    const err = normalizeError({ message: 'Network Error' })
    expect(err.code).toBe(0)
    expect(err.message).toBe('Network Error')
  })

  it('always produces an ApiError so callers handle exactly one error type', () => {
    expect(normalizeError({ message: 'x' })).toBeInstanceOf(ApiError)
  })
})
