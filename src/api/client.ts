import axios, { type AxiosInstance } from 'axios'
import type { Envelope } from './types'

/** 调用方只需处理这一种错误类型：业务码非 0、HTTP 非 2xx、网络中断都归一到这里。 */
export class ApiError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * 运行期配置优先于构建期。
 * CI/CD 只需替换 public/config.js，构建一次即可部署到任意环境。
 */
export function resolveBaseUrl(): string {
  const runtime = window.__APP_CONFIG__?.apiBaseUrl
  if (runtime && runtime.trim()) return runtime.trim()
  return import.meta.env.VITE_API_BASE_URL
}

export function unwrapEnvelope<T>(env: Envelope<T>): T {
  if (env.code !== 0) throw new ApiError(env.code, env.message || 'Request failed')
  return env.data
}

interface ErrorLike {
  message: string
  response?: { status: number; data: unknown }
}

const isEnvelope = (v: unknown): v is Envelope<unknown> =>
  typeof v === 'object' && v !== null && typeof (v as Envelope<unknown>).code === 'number'

/** 业务码优先于 HTTP 状态：服务端用 422 表达自环、409 表达重复关系。 */
export function normalizeError(err: ErrorLike): ApiError {
  const status = err.response?.status
  const body = err.response?.data
  if (isEnvelope(body)) return new ApiError(body.code, body.message || err.message, status)
  return new ApiError(status ?? 0, err.message, status)
}

export function createHttp(): AxiosInstance {
  const instance = axios.create({ baseURL: resolveBaseUrl(), timeout: 15000 })

  // 预留 token 注入位：接真实后端时只改这里，不必逐个请求改。
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('kg_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  instance.interceptors.response.use(
    (res) => ({ ...res, data: unwrapEnvelope(res.data) }),
    (err) => {
      if (axios.isCancel(err)) return Promise.reject(err)
      // ApiError 可能来自成功分支里 unwrapEnvelope 的抛出，不要二次包装
      if (err instanceof ApiError) return Promise.reject(err)
      return Promise.reject(normalizeError(err as ErrorLike))
    },
  )

  return instance
}

export const http = createHttp()
