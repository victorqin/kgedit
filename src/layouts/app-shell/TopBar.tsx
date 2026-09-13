import { Select } from 'antd'
import { useTranslation } from 'react-i18next'
import { useKgStore } from '@/stores/useKgStore'
import { LNG_LABELS, SUPPORTED_LNGS } from '@/i18n'
import { LogoIcon } from './icons'
import './app-shell.css'

export function TopBar() {
  const { t, i18n } = useTranslation()
  const stats = useKgStore((s) => s.stats)

  return (
    <header className="top-bar">
      <div className="top-bar__brand">
        <LogoIcon size={26} />
        <span className="top-bar__title">{t('app.title')}</span>
      </div>

      <div className="top-bar__spacer" />

      {stats && (
        <span className="top-bar__stats">
          {t('app.stats', { nodes: stats.nodeCount, links: stats.linkCount })}
        </span>
      )}

      <Select
        size="small"
        variant="borderless"
        value={i18n.resolvedLanguage}
        onChange={(lng) => void i18n.changeLanguage(lng)}
        aria-label={t('app.language')}
        className="top-bar__lang"
        options={SUPPORTED_LNGS.map((l) => ({ value: l, label: LNG_LABELS[l] }))}
      />

      <div className="top-bar__avatar" aria-hidden="true">
        N
      </div>
    </header>
  )
}
