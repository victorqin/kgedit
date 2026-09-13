import { ConfigProvider, App as AntApp } from 'antd'
import { RouterProvider } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { antdLocaleFor } from '@/i18n'
import { kgTheme } from '@/theme/antdTheme'
import { router } from '@/router'
import '@/styles/global.css'

export default function App() {
  const { i18n } = useTranslation()

  return (
    <ConfigProvider theme={kgTheme} locale={antdLocaleFor(i18n.resolvedLanguage)}>
      <AntApp>
        <RouterProvider router={router} />
      </AntApp>
    </ConfigProvider>
  )
}
