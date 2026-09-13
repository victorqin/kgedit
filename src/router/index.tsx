import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/layouts/app-shell/AppShell'
import { PlaceholderPage } from '@/pages/placeholder/PlaceholderPage'
import OverviewPage from '@/pages/overview/OverviewPage'

// 图谱页体积最大（G6 + 布局），单独切块懒加载，不进首屏包
const KgStudioPage = lazy(() => import('@/pages/kg-studio/KgStudioPage'))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/kg" replace /> },
      {
        path: 'kg',
        element: (
          <Suspense fallback={null}>
            <KgStudioPage />
          </Suspense>
        ),
      },
      { path: 'overview', element: <OverviewPage /> },
      { path: 'explore', element: <PlaceholderPage titleKey="nav.explore" /> },
      { path: 'datasets', element: <PlaceholderPage titleKey="nav.datasets" /> },
      { path: 'settings', element: <PlaceholderPage titleKey="nav.settings" /> },
      { path: '*', element: <Navigate to="/kg" replace /> },
    ],
  },
])
