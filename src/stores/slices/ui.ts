import type { SliceCreator } from '../useKgStore'

export interface Notice {
  /** i18n key，由界面层翻译；text 为服务端原文，优先展示 */
  key?: string
  params?: Record<string, unknown>
  text?: string
  type: 'success' | 'error'
  /** 每次置入都递增，界面据此判断是同一条还是新的一条 */
  at: number
}

export interface UiSlice {
  blocking: boolean
  notice: Notice | null
  withBlocking: <T>(fn: () => Promise<T>) => Promise<T>
  notify: (n: Omit<Notice, 'at'>) => void
  clearNotice: () => void
}

export const createUiSlice: SliceCreator<UiSlice> = (set) => ({
  blocking: false,
  notice: null,

  /**
   * 写操作期间挡住全部交互，保证一次只有一个写请求在飞。
   * 正因为用户被挡住，写路径不需要乐观更新与回滚 —— 直接落服务端返回值即可。
   * 蒙层的 250ms 延迟显示是展示层行为，放在 BlockingOverlay 组件里。
   */
  withBlocking: async (fn) => {
    set((s) => {
      s.blocking = true
    })
    try {
      return await fn()
    } finally {
      set((s) => {
        s.blocking = false
      })
    }
  },

  notify: (n) => {
    set((s) => {
      s.notice = { ...n, at: Date.now() + Math.random() }
    })
  },

  clearNotice: () => {
    set((s) => {
      s.notice = null
    })
  },
})
