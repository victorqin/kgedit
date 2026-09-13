import { Outlet } from 'react-router-dom'
import { SideRail } from './SideRail'
import { TopBar } from './TopBar'
import './app-shell.css'

export function AppShell() {
  return (
    <div className="app-shell">
      <SideRail />
      <div className="app-main">
        <TopBar />
        <Outlet />
      </div>
    </div>
  )
}
