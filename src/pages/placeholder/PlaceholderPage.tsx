import { useTranslation } from 'react-i18next'
import '@/layouts/app-shell/app-shell.css'

interface Props {
  /** i18n key，例如 nav.overview */
  titleKey: string
}

/** 左侧导航的占位页。当前只有知识图谱编辑页是实现页。 */
export function PlaceholderPage({ titleKey }: Props) {
  const { t } = useTranslation()

  return (
    <main className="placeholder-page">
      <div>
        <h1 className="placeholder-page__title">{t(titleKey)}</h1>
        <p className="placeholder-page__body">{t('nav.blankBody')}</p>
      </div>
    </main>
  )
}
