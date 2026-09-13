import type { ReactElement, ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import { I18nextProvider } from 'react-i18next'
import i18n, { antdLocaleFor } from '@/i18n'
import { kgTheme } from '@/theme/antdTheme'

/** 所有组件测试共用的 Provider 外壳，避免每个用例重复搭一遍。 */
export function renderWith(
  ui: ReactElement,
  { route = '/kg', ...options }: RenderOptions & { route?: string } = {},
) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <I18nextProvider i18n={i18n}>
      <ConfigProvider theme={kgTheme} locale={antdLocaleFor(i18n.language)}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </ConfigProvider>
    </I18nextProvider>
  )
  return render(ui, { wrapper: Wrapper, ...options })
}
