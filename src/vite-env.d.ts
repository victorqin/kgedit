/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_USE_MOCK: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  /** 由 public/config.js 注入，用于运行期覆盖构建期配置 */
  __APP_CONFIG__?: { apiBaseUrl?: string }
}
