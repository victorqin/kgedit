import { Button, Input, Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { useKgStore } from '@/stores/useKgStore'
import type { LinkDraft } from '@/stores/slices/editor'
import './editor-modals.css'

export function LinkEditModal() {
  const { t } = useTranslation()
  const editor = useKgStore((s) => s.editor)
  const links = useKgStore((s) => s.links)
  const leftSub = useKgStore((s) => s.leftSub)
  const rightSub = useKgStore((s) => s.rightSub)
  const setDraft = useKgStore((s) => s.setDraft)
  const closeEditor = useKgStore((s) => s.closeEditor)
  const saveEditor = useKgStore((s) => s.saveEditor)
  const askConfirm = useKgStore((s) => s.askConfirm)

  if (!editor || editor.kind !== 'link') return null
  const draft = editor.draft as LinkDraft
  const isNew = editor.id === null

  const nodeLabel = (id: string) =>
    (leftSub?.nodes.find((n) => n.id === id) ?? rightSub?.nodes.find((n) => n.id === id))?.label ??
    id

  const existing = editor.id ? links.find((l) => l.id === editor.id) : undefined
  const source = existing?.source.label ?? (editor.endpoints ? nodeLabel(editor.endpoints.source) : '?')
  const target = existing?.target.label ?? (editor.endpoints ? nodeLabel(editor.endpoints.target) : '?')

  return (
    <Modal
      open
      width={460}
      title={isNew ? t('editor.newRelation') : t('editor.editRelation')}
      onCancel={() => closeEditor(true)}
      destroyOnHidden
      footer={
        <div className="editor-modal__foot">
          {!isNew && (
            <Button danger onClick={() => askConfirm({ kind: 'deleteLink', id: editor.id! })}>
              {t('editor.deleteRelation')}
            </Button>
          )}
          {!isNew && (
            <Button onClick={() => askConfirm({ kind: 'reverseLink', id: editor.id! })}>
              ⇄ {t('relations.reverse')}
            </Button>
          )}
          <div className="editor-modal__foot-spacer" />
          <Button onClick={() => closeEditor(true)}>{t('editor.cancel')}</Button>
          <Button type="primary" disabled={!draft.label.trim()} onClick={() => void saveEditor()}>
            {t('editor.save')}
          </Button>
        </div>
      }
    >
      <div className="editor-modal__field">
        <label className="editor-modal__label" htmlFor="link-label">
          {t('editor.relationLabel', { source, target })}
        </label>
        <Input
          id="link-label"
          value={draft.label}
          placeholder={t('editor.labelPlaceholder')}
          onChange={(e) => setDraft({ label: e.target.value })}
          onPressEnter={() => draft.label.trim() && void saveEditor()}
        />
      </div>

      {editor.error && <div className="editor-modal__error">{editor.error}</div>}
    </Modal>
  )
}
