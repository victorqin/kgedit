import { ApiError } from '@/api/client'
import { createLink, deleteLink, reverseLink, updateLink } from '@/api/links'
import { createNode, deleteNode, getTaxonomy, updateNode } from '@/api/nodes'
import type { NodeInput, Taxonomy } from '@/api/types'
import type { Side } from '@/theme/antdTheme'
import type { SliceCreator } from '../useKgStore'

export interface NodeDraft extends NodeInput {}
export interface LinkDraft {
  label: string
}

export interface EditorState {
  kind: 'node' | 'link'
  /** null 表示新建 */
  id: string | null
  side: Side
  draft: NodeDraft | LinkDraft
  dirty: boolean
  error: string | null
  /** 新建关系时的两端 */
  endpoints?: { source: string; target: string }
}

export type ConfirmState =
  | { kind: 'deleteNode'; id: string; count?: number }
  | { kind: 'deleteLink'; id: string }
  | { kind: 'reverseLink'; id: string }

const EMPTY_NODE: NodeDraft = { label: '', type: '', domain: '', desc: '' }

export interface EditorSlice {
  editor: EditorState | null
  confirm: ConfirmState | null
  taxonomy: Taxonomy | null
  openNodeEditor: (id: string | null, side: Side) => void
  openLinkEditor: (id: string) => void
  setDraft: (patch: Partial<NodeDraft & LinkDraft>) => void
  closeEditor: (force?: boolean) => void
  saveEditor: () => Promise<void>
  askConfirm: (c: ConfirmState) => void
  closeConfirm: () => void
  runConfirm: () => Promise<void>
  toggleStartEndLink: () => Promise<void>
  loadTaxonomy: () => Promise<void>
}

export const createEditorSlice: SliceCreator<EditorSlice> = (set, get) => {
  /**
   * 写操作的统一骨架：蒙层 → 写请求 → 并行刷新受影响的读 → 蒙层撤下。
   * 后续读也圈在同一个蒙层内，避免用户看到「左图已更新、右图还是旧的」的半截状态。
   */
  const mutate = async (work: () => Promise<void>): Promise<boolean> => {
    try {
      await get().withBlocking(async () => {
        await work()
        await get().refreshAll()
      })
      return true
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Something went wrong'
      get().notify({ type: 'error', text: message })
      return false
    }
  }

  return {
    editor: null,
    confirm: null,
    taxonomy: null,

    openNodeEditor: (id, side) => {
      const existing = id
        ? (get().leftSub?.nodes.find((n) => n.id === id) ??
          get().rightSub?.nodes.find((n) => n.id === id))
        : null
      set((s) => {
        s.editor = {
          kind: 'node',
          id,
          side,
          draft: existing
            ? { label: existing.label, type: existing.type, domain: existing.domain, desc: existing.desc }
            : { ...EMPTY_NODE },
          dirty: false,
          error: null,
        }
      })
      void get().loadTaxonomy()
    },

    openLinkEditor: (id) => {
      const link = get().links.find((l) => l.id === id)
      set((s) => {
        s.editor = {
          kind: 'link',
          id,
          side: s.sel?.side ?? 'L',
          draft: { label: link?.label ?? '' },
          dirty: false,
          error: null,
        }
      })
    },

    setDraft: (patch) => {
      set((s) => {
        if (!s.editor) return
        s.editor.draft = { ...s.editor.draft, ...patch }
        s.editor.dirty = true
        s.editor.error = null
      })
    },

    closeEditor: (force = false) => {
      if (!force && get().editor?.dirty) return // 有未保存改动，交由界面层弹确认
      set((s) => {
        s.editor = null
      })
    },

    saveEditor: async () => {
      const editor = get().editor
      if (!editor) return

      const run = async () => {
        if (editor.kind === 'node') {
          const draft = editor.draft as NodeDraft
          if (editor.id) {
            await updateNode(editor.id, draft)
          } else {
            const created = await createNode(draft)
            // 新建成功后才把它设为该侧中心；取消则该侧中心不变
            set((s) => {
              s[editor.side === 'L' ? 'startId' : 'endId'] = created.id
              s[editor.side === 'L' ? 'qStart' : 'qEnd'] = created.label
            })
          }
        } else {
          const draft = editor.draft as LinkDraft
          if (editor.id) {
            await updateLink(editor.id, { label: draft.label, predicate: draft.label })
          } else if (editor.endpoints) {
            await createLink({ ...editor.endpoints, label: draft.label })
          }
        }
      }

      try {
        await get().withBlocking(async () => {
          await run()
          await get().refreshAll()
        })
        set((s) => {
          s.editor = null
        })
        get().notify({ type: 'success', key: editor.id ? 'toast.saved' : 'toast.created' })
      } catch (e) {
        // 保存失败不关闭弹窗，把消息内联展示，用户的输入不丢
        const message = e instanceof ApiError ? e.message : 'Something went wrong'
        set((s) => {
          if (s.editor) s.editor.error = message
        })
      }
    },

    askConfirm: (c) => {
      set((s) => {
        s.confirm = c
      })
    },

    closeConfirm: () => {
      set((s) => {
        s.confirm = null
      })
    },

    runConfirm: async () => {
      const c = get().confirm
      if (!c) return
      set((s) => {
        s.confirm = null
      })

      if (c.kind === 'deleteNode') {
        const ok = await mutate(async () => {
          const res = await deleteNode(c.id)
          set((s) => {
            // 不自作主张跳到别的节点 —— 清空成空状态，由用户重新选择
            if (s.startId === res.deletedNodeId) {
              s.startId = null
              s.leftSub = null
              s.qStart = ''
            }
            if (s.endId === res.deletedNodeId) {
              s.endId = null
              s.rightSub = null
              s.qEnd = ''
            }
            if (s.sel?.id === res.deletedNodeId) {
              s.sel = null
              s.links = []
            }
          })
        })
        if (ok) get().notify({ type: 'success', key: 'toast.nodeDeleted', params: { count: c.count ?? 0 } })
        return
      }

      if (c.kind === 'deleteLink') {
        const ok = await mutate(async () => {
          await deleteLink(c.id)
          set((s) => {
            if (s.sel?.kind === 'edge' && s.sel.id === c.id) {
              s.sel = null
              s.links = []
            }
          })
        })
        if (ok) get().notify({ type: 'success', key: 'toast.linkDeleted' })
        return
      }

      const ok = await mutate(async () => {
        await reverseLink(c.id)
      })
      if (ok) get().notify({ type: 'success', key: 'toast.reversed' })
    },

    /** 允许平行边之后，这颗按钮是「新建」还是「选一条断开」由 directLinks 决定。 */
    toggleStartEndLink: async () => {
      const { startId, endId, path } = get()
      if (!startId || !endId) return
      if (startId === endId) {
        get().notify({ type: 'error', key: 'link.sameNode' })
        return
      }
      if (path?.directLinks.length) return // 已有关系，由界面弹出列表让用户选断哪条

      set((s) => {
        s.editor = {
          kind: 'link',
          id: null,
          side: 'L',
          draft: { label: '' },
          dirty: false,
          error: null,
          endpoints: { source: startId, target: endId },
        }
      })
    },

    loadTaxonomy: async () => {
      if (get().taxonomy) return
      try {
        const t = await getTaxonomy()
        set((s) => {
          s.taxonomy = t
        })
      } catch {
        // 候选项拿不到不影响编辑，字段仍可自由输入
      }
    },
  }
}
