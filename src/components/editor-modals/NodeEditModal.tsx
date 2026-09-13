import { useState } from 'react'
import { AutoComplete, Button, Input, Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { useKgStore } from '@/stores/useKgStore'
import type { NodeDraft } from '@/stores/slices/editor'
import './editor-modals.css'

const toOptions = (values: string[] | undefined) => (values ?? []).map((v) => ({ value: v }))

export function NodeEditModal() {
  const { t } = useTranslation()
  const editor = useKgStore((s) => s.editor)
  const taxonomy = useKgStore((s) => s.taxonomy)
  const setDraft = useKgStore((s) => s.setDraft)
  const closeEditor = useKgStore((s) => s.closeEditor)
  const saveEditor = useKgStore((s) => s.saveEditor)
  const askConfirm = useKgStore((s) => s.askConfirm)
  const setCenter = useKgStore((s) => s.setCenter)

  const [askDiscard, setAskDiscard] = useState(false)

  if (!editor || editor.kind !== 'node') return null
  const draft = editor.draft as NodeDraft
  const isNew = editor.id === null

  const tryClose = () => {
    if (editor.dirty) setAskDiscard(true)
    else closeEditor()
  }

  const field = (
    key: keyof NodeDraft,
    labelKey: string,
    placeholderKey: string,
    candidates?: string[],
  ) => (
    <div className="editor-modal__field">
      <label className="editor-modal__label" htmlFor={`node-${key}`}>
        {t(labelKey)}
      </label>
      {candidates ? (
        <AutoComplete
          id={`node-${key}`}
          value={draft[key]}
          options={toOptions(candidates)}
          placeholder={t(placeholderKey)}
          filterOption={(input, option) =>
            String(option?.value ?? '').toLowerCase().includes(input.toLowerCase())
          }
          onChange={(v) => setDraft({ [key]: v } as Partial<NodeDraft>)}
        />
      ) : (
        <Input
          id={`node-${key}`}
          value={draft[key]}
          placeholder={t(placeholderKey)}
          onChange={(e) => setDraft({ [key]: e.target.value } as Partial<NodeDraft>)}
        />
      )}
    </div>
  )

  return (
    <>
      <Modal
        open
        width={460}
        title={
          isNew ? t('editor.newNode') : t('editor.editNode', { label: draft.label || editor.id })
        }
        onCancel={tryClose}
        destroyOnHidden
        footer={
          <div className="editor-modal__foot">
            {!isNew && (
              <Button danger onClick={() => askConfirm({ kind: 'deleteNode', id: editor.id! })}>
                {t('editor.deleteNode')}
              </Button>
            )}
            {!isNew && (
              <Button
                onClick={() => {
                  closeEditor(true)
                  void setCenter(editor.side, editor.id!)
                }}
              >
                {t('editor.expandAsCenter')}
              </Button>
            )}
            <div className="editor-modal__foot-spacer" />
            <Button onClick={tryClose}>{t('editor.cancel')}</Button>
            <Button
              type="primary"
              disabled={!draft.label.trim()}
              onClick={() => void saveEditor()}
            >
              {t('editor.save')}
            </Button>
          </div>
        }
      >
        {field('label', 'editor.title', 'editor.titlePlaceholder')}
        {field('type', 'editor.type', 'editor.typePlaceholder', taxonomy?.types ?? [])}
        {/* DOMAIN 是设计稿缺失的字段：没有它，用户新建的类型只能掉进 Uncategorized */}
        {field('domain', 'editor.domain', 'editor.domainPlaceholder', taxonomy?.domains ?? [])}
        {field('desc', 'editor.description', 'editor.descPlaceholder')}

        {editor.error && <div className="editor-modal__error">{editor.error}</div>}
      </Modal>

      <Modal
        open={askDiscard}
        title={t('editor.dirtyTitle')}
        okText={t('editor.discard')}
        cancelText={t('editor.keepEditing')}
        okButtonProps={{ danger: true }}
        onCancel={() => setAskDiscard(false)}
        onOk={() => {
          setAskDiscard(false)
          closeEditor(true)
        }}
      >
        <p className="confirm-dialog__body">{t('editor.dirtyBody')}</p>
      </Modal>
    </>
  )
}
