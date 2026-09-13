import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import type { Locale } from 'antd/es/locale'
import antdEnUS from 'antd/locale/en_US'
import antdZhCN from 'antd/locale/zh_CN'
import antdZhTW from 'antd/locale/zh_TW'
import enUS from '@/locales/en-US.json'
import zhCN from '@/locales/zh-CN.json'
import zhTW from '@/locales/zh-TW.json'

export const SUPPORTED_LNGS = ['en-US', 'zh-CN', 'zh-TW'] as const
export type Lng = (typeof SUPPORTED_LNGS)[number]

export const LNG_LABELS: Record<Lng, string> = {
  'en-US': 'English',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
}

const ANTD_LOCALES: Record<Lng, Locale> = {
  'en-US': antdEnUS,
  'zh-CN': antdZhCN,
  'zh-TW': antdZhTW,
}

/** AntD 自带组件（分页、日期、空状态等）的文案需与应用文案同步切换。 */
export const antdLocaleFor = (lng: string | undefined): Locale =>
  ANTD_LOCALES[lng as Lng] ?? antdEnUS

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'en-US': { translation: enUS },
      'zh-CN': { translation: zhCN },
      'zh-TW': { translation: zhTW },
    },
    fallbackLng: 'en-US',
    supportedLngs: SUPPORTED_LNGS,
    // 英文为默认；探测顺序把用户的显式选择放在浏览器偏好之前
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
    interpolation: { escapeValue: false },
  })

export default i18n
