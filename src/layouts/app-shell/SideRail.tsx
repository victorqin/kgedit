import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  DatasetIcon,
  GraphIcon,
  GridIcon,
  LogoIcon,
  SearchIcon,
  SettingsIcon,
} from './icons'
import './app-shell.css'

const ACTIVE_COLOR = '#4ade80'
const IDLE_COLOR = '#58657a'

interface RailItem {
  to: string
  labelKey: string
  Icon: (p: { color: string }) => React.ReactElement
}

/** 目前只有 /kg 是实现页，其余为占位。 */
const ITEMS: RailItem[] = [
  { to: '/overview', labelKey: 'nav.overview', Icon: GridIcon },
  { to: '/explore', labelKey: 'nav.explore', Icon: SearchIcon },
  { to: '/kg', labelKey: 'nav.kg', Icon: GraphIcon },
  { to: '/datasets', labelKey: 'nav.datasets', Icon: DatasetIcon },
  { to: '/settings', labelKey: 'nav.settings', Icon: SettingsIcon },
]

export function SideRail() {
  const { t } = useTranslation()

  return (
    <nav className="side-rail" aria-label={t('nav.main')}>
      <div className="side-rail__logo">
        <LogoIcon />
      </div>

      {ITEMS.map(({ to, labelKey, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className="side-rail__item"
          aria-label={t(labelKey)}
          title={t(labelKey)}
        >
          {({ isActive }) => <Icon color={isActive ? ACTIVE_COLOR : IDLE_COLOR} />}
        </NavLink>
      ))}

      <div className="side-rail__spacer" />
      <div className="side-rail__foot" aria-hidden="true">
        ?
      </div>
    </nav>
  )
}
