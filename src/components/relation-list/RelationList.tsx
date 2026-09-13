import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { useKgStore } from '@/stores/useKgStore'
import { WrenchIcon } from '@/layouts/app-shell/icons'
import { RelationRow } from './RelationRow'
import './relation-list.css'

export function RelationList() {
  const { t } = useTranslation()

  const { sel, links, startId, endId, leftSub, rightSub } = useKgStore(
    useShallow((s) => ({
      sel: s.sel,
      links: s.links,
      startId: s.startId,
      endId: s.endId,
      leftSub: s.leftSub,
      rightSub: s.rightSub,
    })),
  )
  const openLinkEditor = useKgStore((s) => s.openLinkEditor)
  const askConfirm = useKgStore((s) => s.askConfirm)

  const selectedLabel = sel
    ? ((leftSub?.nodes.find((n) => n.id === sel.id) ??
        rightSub?.nodes.find((n) => n.id === sel.id))?.label ?? sel.id)
    : ''

  const caption = !sel
    ? t('relations.nothingSelected')
    : sel.kind === 'edge'
      ? t('relations.selectedLink')
      : t('relations.selectedNode', { label: selectedLabel, count: links.length })

  return (
    <section className="relation-list" aria-label={t('relations.title')}>
      <div className="relation-list__head">
        <WrenchIcon />
        <span className="relation-list__title">{t('relations.title')}</span>
        <div className="relation-list__spacer" />
        <span className="relation-list__caption">{caption}</span>
      </div>

      <div className="relation-list__body">
        {!sel && (
          <div className="relation-list__empty">
            {t('relations.empty')}
            <br />
            {t('relations.empty2')}
          </div>
        )}

        {sel && links.length === 0 && (
          <div className="relation-list__empty">{t('relations.none')}</div>
        )}

        {links.map((link, i) => (
          <RelationRow
            key={link.id}
            link={link}
            index={i}
            startId={startId}
            endId={endId}
            onEdit={openLinkEditor}
            // 反转与删除都必须先过二次确认 —— 这几个按钮挨得很近，误点代价高
            onReverse={(id) => askConfirm({ kind: 'reverseLink', id })}
            onDelete={(id) => askConfirm({ kind: 'deleteLink', id })}
          />
        ))}
      </div>
    </section>
  )
}
