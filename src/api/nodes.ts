import { http } from './client'
import type {
  DeleteNodeResult,
  KgNode,
  LinkDetail,
  NodeInput,
  Taxonomy,
  TreeResponse,
} from './types'

export const getNodeTree = (params: { q: string; limit?: number }, signal?: AbortSignal) =>
  http.get<TreeResponse>('/nodes/tree', { params, signal }).then((r) => r.data)

/** 编辑弹窗的 DOMAIN / TYPE 候选项 */
export const getTaxonomy = () => http.get<Taxonomy>('/meta/taxonomy').then((r) => r.data)

export const getNodeLinks = (id: string, signal?: AbortSignal) =>
  http.get<LinkDetail[]>(`/nodes/${id}/links`, { signal }).then((r) => r.data)

export const createNode = (input: NodeInput) =>
  http.post<KgNode>('/nodes', input).then((r) => r.data)

export const updateNode = (id: string, patch: Partial<NodeInput>) =>
  http.patch<KgNode>(`/nodes/${id}`, patch).then((r) => r.data)

export const deleteNode = (id: string) =>
  http.delete<DeleteNodeResult>(`/nodes/${id}`).then((r) => r.data)
