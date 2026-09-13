import { getNodeTree } from '@/api/nodes'
import type { TreeNode } from '@/api/types'
import { seq } from '@/lib/requestSeq'
import type { Side } from '@/theme/antdTheme'
import type { SliceCreator } from '../useKgStore'

export interface PickerSlice {
  qStart: string
  qEnd: string
  openSide: Side | null
  treeL: TreeNode[]
  treeR: TreeNode[]
  hlId: string | null
  hint: string
  loadingTree: boolean
  setQuery: (side: Side, q: string) => Promise<void>
  openPicker: (side: Side) => Promise<void>
  closePicker: () => void
  pickNode: (side: Side, id: string) => Promise<void>
  runSearch: (side: Side) => Promise<void>
  moveHighlight: (side: Side, direction: 1 | -1) => void
  leafIds: (side: Side) => string[]
  loadTree: (side: Side) => Promise<void>
}

const QUERY_KEY = { L: 'qStart', R: 'qEnd' } as const
const TREE_KEY = { L: 'treeL', R: 'treeR' } as const
const SUB_KEY = { L: 'leftSub', R: 'rightSub' } as const

/** 把 域 ▸ 类型 ▸ 节点 的树摊平成叶子数组，供方向键导航与匹配使用。 */
const flattenLeaves = (tree: TreeNode[]): TreeNode[] =>
  tree.flatMap((n) => (n.nodeId ? [n] : flattenLeaves(n.children ?? [])))

export const createPickerSlice: SliceCreator<PickerSlice> = (set, get) => ({
  qStart: '',
  qEnd: '',
  openSide: null,
  treeL: [],
  treeR: [],
  hlId: null,
  hint: '',
  loadingTree: false,

  leafIds: (side) => flattenLeaves(get()[TREE_KEY[side]]).map((n) => n.nodeId!),

  loadTree: async (side) => {
    const key = `tree:${side}`
    const ticket = seq.next(key)
    set((s) => {
      s.loadingTree = true
    })
    try {
      const { tree } = await getNodeTree({ q: get()[QUERY_KEY[side]] })
      if (!seq.isCurrent(key, ticket)) return // 用户已经继续打字了，这份结果作废
      set((s) => {
        s[TREE_KEY[side]] = tree
      })
    } catch {
      if (!seq.isCurrent(key, ticket)) return
      set((s) => {
        s[TREE_KEY[side]] = []
      })
    } finally {
      if (seq.isCurrent(key, ticket)) {
        set((s) => {
          s.loadingTree = false
        })
      }
    }
  },

  setQuery: async (side, q) => {
    set((s) => {
      s[QUERY_KEY[side]] = q
      s.openSide = side
      s.hint = ''
      s.hlId = null // 结果集变了，旧的高亮不再有意义
    })
    await get().loadTree(side)
  },

  openPicker: async (side) => {
    set((s) => {
      s.openSide = side
    })
    await get().loadTree(side)
  },

  closePicker: () => {
    set((s) => {
      s.openSide = null
      s.hlId = null
    })
  },

  pickNode: async (side, id) => {
    set((s) => {
      s.openSide = null
      s.hlId = null
      s.hint = ''
    })
    await get().setCenter(side, id)
    // 子图回来后中心节点必然在里面，从那里取权威的 label 回填输入框
    const label = get()[SUB_KEY[side]]?.nodes.find((n) => n.id === id)?.label
    if (label) {
      set((s) => {
        s[QUERY_KEY[side]] = label
      })
    }
  },

  /** Search 按钮：先精确匹配 label，再退回第一个模糊命中。与从树上点选是两条不同入口。 */
  runSearch: async (side) => {
    const q = get()[QUERY_KEY[side]].trim()
    if (!q) return

    const { tree } = await getNodeTree({ q })
    const leaves = flattenLeaves(tree)
    const needle = q.toLowerCase()
    const hit =
      leaves.find((n) => n.label.toLowerCase() === needle) ??
      leaves.find((n) => n.label.toLowerCase().includes(needle))

    if (!hit?.nodeId) {
      set((s) => {
        s.hint = `No node matched "${q}"`
      })
      return
    }
    set((s) => {
      s.hint = ''
    })
    await get().pickNode(side, hit.nodeId)
  },

  moveHighlight: (side, direction) => {
    const ids = get().leafIds(side)
    if (!ids.length) return
    const index = ids.indexOf(get().hlId ?? '')
    const next =
      direction === 1
        ? (index + 1) % ids.length
        : index <= 0
          ? ids.length - 1
          : index - 1
    set((s) => {
      s.openSide = side
      s.hlId = ids[next]
    })
  },
})
