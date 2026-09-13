import { useTranslation } from 'react-i18next'
import type { GraphMeta } from '@/api/types'
import './graph-panel.css'

interface Props {
  meta: GraphMeta
  /** 实际渲染出来的节点数 */
  shown: number
  simplified: boolean
}

/**
 * hops 不设上限，深查询可能拉回远超可读范围的结果。
 * 服务端按 nodeCap 截断后，这里明确告诉用户「看到的不是全部」。
 */
export function TruncationNotice({ meta, shown, simplified }: Props) {
  const { t } = useTranslation()
  if (!meta.truncated && !simplified) return null

  return (
    <div className="graph-panel__notice" role="status">
      {meta.truncated
        ? t('panel.truncated', {
            shown: shown.toLocaleString(),
            total: meta.totalNodes.toLocaleString(),
          })
        : t('panel.simplified')}
    </div>
  )
}
