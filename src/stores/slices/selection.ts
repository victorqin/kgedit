import { getLink } from '@/api/links'
import { getNodeLinks } from '@/api/nodes'
import type { LinkDetail } from '@/api/types'
import { seq } from '@/lib/requestSeq'
import type { Side } from '@/theme/antdTheme'
import type { SliceCreator } from '../useKgStore'

export interface Selection {
  side: Side
  kind: 'node' | 'edge'
  id: string
}

export interface SelectionSlice {
  sel: Selection | null
  links: LinkDetail[]
  loadingLinks: boolean
  selectNode: (side: Side, id: string) => Promise<void>
  selectEdge: (side: Side, id: string) => Promise<void>
  clearSelection: () => void
  reloadLinks: () => Promise<void>
}

const LINKS_KEY = 'links'

export const createSelectionSlice: SliceCreator<SelectionSlice> = (set, get) => ({
  sel: null,
  links: [],
  loadingLinks: false,

  selectNode: async (side, id) => {
    set((s) => {
      s.sel = { side, kind: 'node', id }
    })
    await get().reloadLinks()
  },

  selectEdge: async (side, id) => {
    set((s) => {
      s.sel = { side, kind: 'edge', id }
    })
    await get().reloadLinks()
  },

  clearSelection: () => {
    set((s) => {
      s.sel = null
      s.links = []
    })
  },

  /**
   * 按当前选中项重新拉取关系列表。写操作成功后也会调用这个。
   * 选中的实体如果已经不存在（刚被删掉），就清空选中而不是报错。
   */
  reloadLinks: async () => {
    const sel = get().sel
    if (!sel) return

    const ticket = seq.next(LINKS_KEY)
    set((s) => {
      s.loadingLinks = true
    })

    try {
      const links = sel.kind === 'node' ? await getNodeLinks(sel.id) : [await getLink(sel.id)]
      if (!seq.isCurrent(LINKS_KEY, ticket)) return
      set((s) => {
        s.links = links
      })
    } catch {
      if (!seq.isCurrent(LINKS_KEY, ticket)) return
      set((s) => {
        s.sel = null
        s.links = []
      })
    } finally {
      if (seq.isCurrent(LINKS_KEY, ticket)) {
        set((s) => {
          s.loadingLinks = false
        })
      }
    }
  },
})
