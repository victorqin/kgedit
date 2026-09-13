import { useTranslation } from 'react-i18next'
import type { LinkDetail } from '@/api/types'
import './relation-list.css'

interface Props {
  link: LinkDetail
  index: number
  startId: string | null
  endId: string | null
  onEdit: (id: string) => void
  onReverse: (id: string) => void
  onDelete: (id: string) => void
}

/**
 * 三个动作都是真 <button>。图本身对键盘用户不可达，
 * 这一行是访问全部关系与操作的唯一键盘路径。
 */
export function RelationRow({ link, index, startId, endId, onEdit, onReverse, onDelete }: Props) {
  const { t } = useTranslation()

  const endpointClass = (id: string) =>
    `relation-row__endpoint${
      id === startId
        ? ' relation-row__endpoint--start'
        : id === endId
          ? ' relation-row__endpoint--end'
          : ''
    }`

  const describe = `[${link.source.label}] ${link.label} [${link.target.label}]`

  return (
    <div className="relation-row">
      <span className="relation-row__num">{String(index + 1).padStart(2, '0')}</span>

      <div className="relation-row__triple">
        <span className={endpointClass(link.source.id)}>[{link.source.label}]</span>
        <span className="relation-row__rail" aria-hidden="true">
          ════
        </span>
        <span className="relation-row__label">{link.label}</span>
        <span className="relation-row__rail" aria-hidden="true">
          ════▶
        </span>
        <span className={endpointClass(link.target.id)}>[{link.target.label}]</span>
      </div>

      <div className="relation-row__actions">
        <button
          type="button"
          className="relation-row__btn relation-row__btn--edit"
          aria-label={`${t('relations.edit')} ${describe}`}
          onClick={() => onEdit(link.id)}
        >
          {t('relations.edit')}
        </button>
        <button
          type="button"
          className="relation-row__btn relation-row__btn--reverse"
          aria-label={`${t('relations.reverse')} ${describe}`}
          onClick={() => onReverse(link.id)}
        >
          ⇄ {t('relations.reverse')}
        </button>
        <button
          type="button"
          className="relation-row__btn relation-row__btn--delete"
          aria-label={`${t('relations.delete')} ${describe}`}
          onClick={() => onDelete(link.id)}
        >
          {t('relations.delete')}
        </button>
      </div>
    </div>
  )
}
