import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { useKgStore } from '@/stores/useKgStore'
import { GlobeIcon } from '@/layouts/app-shell/icons'
import './path-status.css'

export function PathStatus() {
  const { t } = useTranslation()
  const { path, startId, endId, qStart, qEnd } = useKgStore(
    useShallow((s) => ({
      path: s.path,
      startId: s.startId,
      endId: s.endId,
      qStart: s.qStart,
      qEnd: s.qEnd,
    })),
  )
  const setCenter = useKgStore((s) => s.setCenter)

  const segments = path?.segments ?? []
  const hasPath = Boolean(path?.found) && segments.length > 0

  return (
    <section className="path-status" aria-label={t('path.title')}>
      <div className="path-status__label">
        <GlobeIcon />
        <span className="path-status__label-text">{t('path.title')}</span>
      </div>

      <div className="path-status__divider" />

      <div className="path-status__track">
        {!hasPath && (
          <div className="path-status__none">
            {!startId || !endId
              ? t('path.empty')
              : t('path.none', { from: qStart || startId, to: qEnd || endId })}
          </div>
        )}

        {hasPath && (
          <div className="path-status__segments">
            {segments.map((seg, i) => {
              const modifier =
                seg.node.id === startId ? 'start' : seg.node.id === endId ? 'end' : ''
              return (
                <div className="path-status__segment" key={`${seg.node.id}-${i}`}>
                  {seg.edge && (
                    <span className="path-status__arrow">
                      {/* reversed 表示这一段是逆着边的方向走的，箭头必须跟着翻，
                          否则会谎报关系方向 —— 设计稿原型正是漏了这一点 */}
                      {seg.edge.reversed
                        ? `◀──(${seg.edge.label})──`
                        : `──(${seg.edge.label})──▶`}
                    </span>
                  )}
                  <button
                    type="button"
                    className={`path-status__node${modifier ? ` path-status__node--${modifier}` : ''}`}
                    title={t('path.segmentTip')}
                    onClick={() => void setCenter('L', seg.node.id)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      void setCenter('R', seg.node.id)
                    }}
                  >
                    [{seg.node.label}]
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="path-status__divider" />
      <span className="path-status__hint">{t('path.hint')}</span>
    </section>
  )
}
