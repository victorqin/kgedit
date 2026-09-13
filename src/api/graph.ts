import { http } from './client'
import type { GraphPayload, PathResponse, Stats } from './types'

export const getStats = () => http.get<Stats>('/graph/stats').then((r) => r.data)

export const getNeighborhood = (
  params: { centerId: string; hops: number; limit?: number },
  signal?: AbortSignal,
) => http.get<GraphPayload>('/graph/neighborhood', { params, signal }).then((r) => r.data)

export const getPath = (params: { from: string; to: string }, signal?: AbortSignal) =>
  http.get<PathResponse>('/graph/path', { params, signal }).then((r) => r.data)
