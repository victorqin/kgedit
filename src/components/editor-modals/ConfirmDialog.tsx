import { useEffect, useState, type ReactNode } from 'react'
import { Modal } from 'antd'
import { useTranslation } from 'react-i18next'
import { useKgStore } from '@/stores/useKgStore'
import { getNodeLinks } from '@/api/nodes'
import type { ConfirmState } from '@/stores/slices/editor'
import type { LinkDetail } from '@/api/types'
import './editor-modals.css'

interface Presentation {
  title: string
  body: ReactNode
  okText: string
  danger: boolean
}

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

  // 连带删除的关系条数：调用方没给就去问一次。
  // 连 id 一起存，避免切换确认对象时短暂显示上一个节点的数字。
  const [fetched, setFetched] = useState<{ id: string; count: number } | null>(null)

  const needsCount = confirm?.kind === 'deleteNode' && confirm.count === undefined
  const pendingId = needsCount ? confirm.id : null

  useEffect(() => {
    if (!pendingId) return
    let alive = true
    void getNodeLinks(pendingId)
      .then((l) => alive && setFetched({ id: pendingId, count: l.length }))
      .catch(() => alive && setFetched({ id: pendingId, count: 0 }))
    return () => {
      alive = false
    }
  }, [pendingId])

  if (!confirm) return null

  const findLink = (id: string): LinkDetail | undefined =>
    links.find((l) => l.id === id) ?? directLinks?.find((l) => l.id === id)

  const nodeLabel = (id: string) =>
    (leftSub?.nodes.find((n) => n.id === id) ?? rightSub?.nodes.find((n) => n.id === id))?.label ??
    id

  const present = (c: ConfirmState): Presentation => {
    if (c.kind === 'deleteNode') {
      const count = c.count ?? (fetched?.id === c.id ? fetched.count : undefined)
      return {
        title: t('confirm.deleteNodeTitle', { label: nodeLabel(c.id) }),
        body: (
          <p className="confirm-dialog__body">
            {t('confirm.deleteNodeBody', { count: count ?? '…' })}
          </p>
        ),
        okText: t('confirm.delete'),
        danger: true,
      }
    }

    const link = findLink(c.id)
    const parts = {
      source: link?.source.label ?? '?',
      target: link?.target.label ?? '?',
      label: link?.label ?? '?',
    }

    if (c.kind === 'deleteLink') {
      return {
        title: t('confirm.deleteLinkTitle'),
        body: (
          <>
            <p className="confirm-dialog__body">{t('confirm.deleteLinkBody')}</p>
            <div className="confirm-dialog__triple">{t('confirm.triple', parts)}</div>
          </>
        ),
        okText: t('confirm.delete'),
        danger: true,
      }
    }

    // 反转是可逆的，用中性按钮；但前后对比必须写清楚，
    // 因为这几个按钮在关系行里挨得很近，误点的代价是关系语义被悄悄改掉。
    return {
      title: t('confirm.reverseTitle'),
      body: (
        <div className="confirm-dialog__triple">
          {t('confirm.reverseNow', parts)}
          {'\n'}
          {t('confirm.reverseAfter', parts)}
        </div>
      ),
      okText: t('confirm.confirm'),
      danger: false,
    }
  }

  const { title, body, okText, danger } = present(confirm)

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
