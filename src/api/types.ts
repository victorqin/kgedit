// ---------------------------------------------------------------------------
// 属性图（property graph）模型。相比纯三元组：节点属性随子图一次返回，卡片的
// Type / Desc 不需要二次查询；边有稳定 id，反转 / 删除 / 改标签都可直接寻址。
// ---------------------------------------------------------------------------

export interface KgNode {
  id: string
  label: string
  type: string
  /** 下拉树的第一层分组。设计稿原型里这是前端硬编码的映射表，此处升为一等字段。 */
  domain: string
  desc: string
  /** 服务端给出，空搜索词时按度数取 Top N */
  degree?: number
  props?: Record<string, unknown>
}

export interface KgEdge {
  id: string
  source: string
  target: string
  /** 展示用标签 */
  label: string
  /** 语义标识，参与 UNIQUE(source, target, predicate) 约束 */
  predicate: string
  directed: true
  props?: Record<string, unknown>
}

export interface LinkEndpoint {
  id: string
  label: string
}

/** 下方连接列表用：端点已解析成 {id,label}，避免为每一行再查一次节点表。 */
export interface LinkDetail {
  id: string
  source: LinkEndpoint
  target: LinkEndpoint
  label: string
  predicate: string
  directed: true
  props?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface GraphMeta {
  centerId: string
  hops: number
  /** 结果被 nodeCap 截断 */
  truncated: boolean
  nodeCap: number
  /** 未截断时的真实规模，用于「显示 200 / 共 1,243」提示 */
  totalNodes: number
}

export interface GraphPayload {
  nodes: KgNode[]
  edges: KgEdge[]
  meta: GraphMeta
}

/** 域 ▸ 类型 ▸ 节点 三层结构，分组在服务端完成 */
export interface TreeNode {
  key: string
  label: string
  count?: number
  /** 仅叶子节点有值 */
  nodeId?: string
  meta?: string
  children?: TreeNode[]
}

export interface TreeResponse {
  total: number
  tree: TreeNode[]
}

export interface PathSegment {
  node: LinkEndpoint
  /**
   * 首段无 edge。reversed 表示这一段是逆着边的方向走的 ——
   * 设计稿原型遗漏了它，导致逆向段的箭头方向是错的。
   */
  edge?: { id: string; label: string; reversed: boolean }
}

export interface PathResponse {
  found: boolean
  segments: PathSegment[]
  /** 起点与终点之间已存在的全部关系，供中间那颗连接按钮使用 */
  directLinks: LinkDetail[]
}

export interface Taxonomy {
  domains: string[]
  types: string[]
}

export interface Stats {
  nodeCount: number
  linkCount: number
}

export interface DeleteNodeResult {
  deletedNodeId: string
  /** 连带删除的关系，前端据此就地剪枝 */
  deletedLinkIds: string[]
}

export interface DeleteLinkResult {
  deletedLinkId: string
}

export interface NodeInput {
  label: string
  type: string
  domain: string
  desc: string
}

export interface LinkInput {
  source: string
  target: string
  label: string
  predicate?: string
}

export interface Envelope<T> {
  code: number
  data: T
  message: string
}

/** 业务错误码，服务端与 mock 共用 */
export const ERR = {
  SELF_LOOP: 422,
  DUPLICATE: 409,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
} as const
