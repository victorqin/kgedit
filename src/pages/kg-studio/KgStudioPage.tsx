import { useEffect } from 'react'
import { App } from 'antd'
import { useTranslation } from 'react-i18next'
import { useKgStore } from '@/stores/useKgStore'
import { useUrlSync } from '@/stores/urlSync'
import { NodePicker } from '@/components/node-picker/NodePicker'
import { PathStatus } from '@/components/path-status/PathStatus'
import { GraphPanel } from '@/components/graph-panel/GraphPanel'
import { LinkToggle } from '@/components/link-toggle/LinkToggle'
import { RelationList } from '@/components/relation-list/RelationList'
import { NodeEditModal } from '@/components/editor-modals/NodeEditModal'
import { LinkEditModal } from '@/components/editor-modals/LinkEditModal'
import { ConfirmDialog } from '@/components/editor-modals/ConfirmDialog'
import { BlockingOverlay } from '@/components/blocking-overlay/BlockingOverlay'
import './kg-studio.css'

/** store 只存「要说什么」，由这里翻译并交给 AntD 展示，保持 store 与 UI 解耦。 */
function useNoticeBridge() {
  const { message } = App.useApp()
  const { t } = useTranslation()
  const notice = useKgStore((s) => s.notice)
  const clearNotice = useKgStore((s) => s.clearNotice)

  useEffect(() => {
    if (!notice) return
    const text = notice.text ?? (notice.key ? t(notice.key, notice.params ?? {}) : '')
    if (text) void message[notice.type](text)
    clearNotice()
  }, [notice, message, t, clearNotice])
}

export default function KgStudioPage() {
  useUrlSync()
  useNoticeBridge()

  const hint = useKgStore((s) => s.hint)

  return (
    <main className="kg-studio">
      <div className="kg-studio__search-row">
        <NodePicker side="L" />
        <div className="kg-studio__gutter" />
        <NodePicker side="R" />
      </div>

      {hint && <div className="kg-studio__hint">{hint}</div>}

      <PathStatus />

      <div className="kg-studio__panels">
        <GraphPanel side="L" />
        <LinkToggle />
        <GraphPanel side="R" />
      </div>

      <RelationList />

      <NodeEditModal />
      <LinkEditModal />
      <ConfirmDialog />
      <BlockingOverlay />
    </main>
  )
}
