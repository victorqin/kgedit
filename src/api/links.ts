import { http } from './client'
import type { DeleteLinkResult, LinkDetail, LinkInput } from './types'

export const getLink = (id: string, signal?: AbortSignal) =>
  http.get<LinkDetail>(`/links/${id}`, { signal }).then((r) => r.data)

export const createLink = (input: LinkInput) =>
  http.post<LinkDetail>('/links', input).then((r) => r.data)

export const updateLink = (id: string, patch: { label?: string; predicate?: string }) =>
  http.patch<LinkDetail>(`/links/${id}`, patch).then((r) => r.data)

export const reverseLink = (id: string) =>
  http.post<LinkDetail>(`/links/${id}/reverse`).then((r) => r.data)

export const deleteLink = (id: string) =>
  http.delete<DeleteLinkResult>(`/links/${id}`).then((r) => r.data)
