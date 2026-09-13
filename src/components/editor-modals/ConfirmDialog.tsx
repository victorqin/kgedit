import { useEffect, useState } from 'react'
import { Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { useKgStore } from '@/stores/useKgStore'
import { getNodeLinks } from '@/api/nodes'
import type { LinkDetail } from '@/api/types'
import './editor-modals.css'

/**
 * 删除节点、删除关系、反转关系三种确认共用这里。
 * 每一种都把「具体会发生什么」摆出来，而不是只做一道速度带。
 */
export function ConfirmDialog() {
  const { t } = useTranslation()
  const confirm = useKgStore((s) => s.confirm)
  const links = useKgStore((s) => s.links)
  const directLinks = useKgStore((s) => s.path?.directLinks)
  const closeConfirm = useKgStore((s) => s.closeConfirm)
  const runConfirm = useKgStore((s) => s.runConfirm)
  const leftSub = useKgStore((s) => s.leftSub)
  const rightSub = useKgStore((s) => s.rightSub)

  const [nodeLinkCount, setNodeLinkCount] = useState<number | null>(null)

  // 删除节点要告诉用户会连带删掉多少条关系；不知道就去问一次
  useEffect(() => {
    if (confirm?.kind !== 'deleteNode') {
      setNodeLinkCount(null)
      return
    }
    if (confirm.count !== undefined) {
      setNodeLinkCount(confirm.count)
      return
    }
    let alive = true
    void getNodeLinks(confirm.id)
      .then((l) => alive && setNodeLinkCount(l.length))
      .catch(() => alive && setNodeLinkCount(0))
    return () => {
      alive = false
    }
  }, [confirm])

  if (!confirm) return null

  const findLink = (id: string): LinkDetail | undefined =>
    links.find((l) => l.id === id) ?? directLinks?.find((l) => l.id === id)

  const nodeLabel = (id: string) =>
    (leftSub?.nodes.find((n) => n.id === id) ?? rightSub?.nodes.find((n) => n.id === id))?.label ??
    id

  let title = ''
  let body: React.ReactNode = null
  let danger = true
  let okText = t('confirm.delete')

  if (confirm.kind === 'deleteNode') {
    title = t('confirm.deleteNodeTitle', { label: nodeLabel(confirm.id) })
    body = (
      <p className="confirm-dialog__body">
        {t('confirm.deleteNodeBody', { count: nodeLinkCount ?? 0 })}
      </p>
    )
  } else {
    const link = findLink(confirm.id)
    const parts = {
      source: link?.source.label ?? '?',
      target: link?.target.label ?? '?',
      label: link?.label ?? '?',
    }

    if (confirm.kind === 'deleteLink') {
      title = t('confirm.deleteLinkTitle')
      body = (
        <>
          <p className="confirm-dialog__body">{t('confirm.deleteLinkBody')}</p>
          <div className="confirm-dialog__triple">{t('confirm.triple', parts)}</div>
        </>
      )
    } else {
      danger = false
      okText = t('confirm.confirm')
      title = t('confirm.reverseTitle')
      body = (
        <div className="confirm-dialog__triple">
          {t('confirm.reverseNow', parts)}
          {'\n'}
          {t('confirm.reverseAfter', parts)}
        </div>
      )
    }
  }

  return (
    <Modal
      open
      title={title}
      onCancel={closeConfirm}
      onOk={() => void runConfirm()}
      okText={okText}
      cancelText={t('confirm.cancel')}
      okButtonProps={{ danger }}
      destroyOnHidden
      width={460}
    >
      {body}
    </Modal>
  )
}
