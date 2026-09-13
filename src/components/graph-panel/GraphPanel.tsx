import { Spin } from 'antd'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { useKgStore } from '@/stores/useKgStore'
import { useG6Graph } from '@/graph/useG6Graph'
import { BoltIcon, TargetIcon } from '@/layouts/app-shell/icons'
import { HopsInput } from './HopsInput'
import { TruncationNotice } from './TruncationNotice'
import type { Side } from '@/theme/antdTheme'
import './graph-panel.css'

const SUB = { L: 'leftSub', R: 'rightSub' } as const

export function GraphPanel({ side }: { side: Side }) {
  const { t } = useTranslation()

  const { payload, hops, loading, error, selection } = useKgStore(
    useShallow((s) => ({
      payload: s[SUB[side]],
      hops: s.hops,
      loading: s.loading[side],
      error: s.error[side],
      selection: s.sel,
    })),
  )

  const setHops = useKgStore((s) => s.setHops)
  const loadSide = useKgStore((s) => s.loadSide)
  const selectNode = useKgStore((s) => s.selectNode)
  const selectEdge = useKgStore((s) => s.selectEdge)
  const setCenter = useKgStore((s) => s.setCenter)
  const openNodeEditor = useKgStore((s) => s.openNodeEditor)
  const openLinkEditor = useKgStore((s) => s.openLinkEditor)
  const clearSelection = useKgStore((s) => s.clearSelection)

  const { containerRef, simplified } = useG6Graph({
    payload,
    side,
    selection,
    handlers: {
      onNodeClick: (id) => void selectNode(side, id),
      onNodeDblClick: (id) => void setCenter(side, id),
      onNodeContextMenu: (id) => {
        void selectNode(side, id)
        openNodeEditor(id, side)
      },
      onEdgeClick: (id) => void selectEdge(side, id),
      onEdgeContextMenu: (id) => {
        void selectEdge(side, id)
        openLinkEditor(id)
      },
      onCanvasClick: clearSelection,
    },
  })

  const isEmpty = !payload && !loading && !error

  return (
    <section className={`graph-panel graph-panel--${side}`} aria-label={t(`panel.${side === 'L' ? 'startTitle' : 'endTitle'}`)}>
      <div className="graph-panel__head">
        {side === 'L' ? <BoltIcon /> : <TargetIcon />}
        <span className="graph-panel__title">
          {t(side === 'L' ? 'panel.startTitle' : 'panel.endTitle')}
        </span>

        <div className="graph-panel__spacer" />

        <button
          type="button"
          className="graph-panel__add"
          title={t('panel.newNode')}
          aria-label={t('panel.newNode')}
          onClick={() => openNodeEditor(null, side)}
        >
          +
        </button>

        <div className="graph-panel__hops">
          <HopsInput value={hops} onChange={setHops} />
          <span className="graph-panel__hops-label">{t('panel.hops')}</span>
        </div>
      </div>

      {error && (
        <div className="graph-panel__error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void loadSide(side)}>
            {t('error.retry')}
          </button>
        </div>
      )}

      {payload && (
        <TruncationNotice meta={payload.meta} shown={payload.nodes.length} simplified={simplified} />
      )}

      <div className="graph-panel__body">
        <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

        {loading && (
          <div className="graph-panel__overlay">
            <Spin />
          </div>
        )}

        {isEmpty && (
          <div className="graph-panel__overlay">
            <div>
              <div className="graph-panel__empty-title">{t('panel.empty')}</div>
              <div className="graph-panel__empty-hint">{t('panel.emptyHint')}</div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
