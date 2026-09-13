import { useState } from 'react'
import { Button, Popover } from 'antd'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { useKgStore } from '@/stores/useKgStore'
import type { LinkDetail } from '@/api/types'
import { LinkedIcon, UnlinkedIcon } from '@/layouts/app-shell/icons'
import './link-toggle.css'

/** 必须是模块级常量：在 selector 里写 `?? []` 每次都会新建数组，
    useShallow 永远比不相等，组件会无限重渲染。 */
const NO_LINKS: LinkDetail[] = []

/**
 * 设计稿里这是一个二元的「已连接 / 未连接」开关。
 * 允许平行边之后二元状态已经表达不了了 —— 有多条关系时，
 * 必须让用户选择断开哪一条，而不是替他猜。
 */
export function LinkToggle() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const { directLinks, startId, endId } = useKgStore(
    useShallow((s) => ({
      directLinks: s.path?.directLinks ?? NO_LINKS,
      startId: s.startId,
      endId: s.endId,
    })),
  )
  const toggleStartEndLink = useKgStore((s) => s.toggleStartEndLink)
  const askConfirm = useKgStore((s) => s.askConfirm)

  const count = directLinks.length
  const linked = count > 0
  const sameNode = Boolean(startId) && startId === endId
  const disabled = !startId || !endId || sameNode

  const caption = sameNode
    ? t('link.sameNode')
    : linked
      ? count === 1
        ? t('link.linked')
        : t('link.linkedCount', { count })
      : t('link.notLinked')

  const button = (
    <button
      type="button"
      className={`link-toggle__btn${linked ? ' link-toggle__btn--linked' : ''}`}
      disabled={disabled}
      title={linked ? t('link.cut') : t('link.join')}
      aria-label={caption}
      onClick={() => {
        if (linked) setOpen((v) => !v)
        else void toggleStartEndLink()
      }}
    >
      {linked ? <LinkedIcon /> : <UnlinkedIcon />}
    </button>
  )

  return (
    <div className="link-toggle">
      <div className="link-toggle__rule link-toggle__rule--top" />

      {linked ? (
        <Popover
          open={open}
          onOpenChange={setOpen}
          trigger="click"
          title={t('link.pickToCut')}
          content={
            <div className="link-toggle__cut-list">
              {directLinks.map((l) => (
                <div className="link-toggle__cut-row" key={l.id}>
                  <span className="link-toggle__cut-label">{l.label}</span>
                  <Button
                    size="small"
                    danger
                    onClick={() => {
                      setOpen(false)
                      askConfirm({ kind: 'deleteLink', id: l.id })
                    }}
                  >
                    {t('link.cutOne')}
                  </Button>
                </div>
              ))}
            </div>
          }
        >
          {button}
        </Popover>
      ) : (
        button
      )}

      <div className="link-toggle__caption">{caption}</div>
      <div className="link-toggle__rule link-toggle__rule--bottom" />
    </div>
  )
}
