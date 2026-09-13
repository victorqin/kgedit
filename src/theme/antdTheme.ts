import { theme, type ThemeConfig } from 'antd'

/** 左侧以 Start 节点为中心，右侧以 End 为中心；绿/蓝贯穿全局作为两侧的身份标识。 */
export const ACCENT = { L: '#4ade80', R: '#60a5fa' } as const
export const ACCENT_HI = { L: '#6ee79a', R: '#84baff' } as const
/** 按钮等实心强调色块上的前景色 */
export const ACCENT_INK = { L: '#062012', R: '#04121f' } as const
/** 面板与输入框的描边色，比强调色暗，用于非激活态 */
export const SIDE_BORDER = { L: '#2f6b45', R: '#2d5680' } as const

export type Side = keyof typeof ACCENT

export const OTHER_SIDE: Record<Side, Side> = { L: 'R', R: 'L' }

export const kgTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: ACCENT.L,
    colorInfo: ACCENT.R,
    colorBgBase: '#0b0f15',
    colorBgContainer: '#0f151e',
    colorBgElevated: '#0f151e',
    colorBgLayout: '#0b0f15',
    colorBorder: '#2b3543',
    colorBorderSecondary: '#1c2431',
    colorText: '#e2e8f0',
    colorTextSecondary: '#cbd5e1',
    colorTextTertiary: '#8b97ab',
    colorTextQuaternary: '#4b5769',
    colorError: '#f87171',
    colorWarning: '#f59e0b',
    colorSuccess: ACCENT.L,
    fontFamily: "'IBM Plex Sans', system-ui, -apple-system, sans-serif",
    fontFamilyCode: "'IBM Plex Mono', ui-monospace, monospace",
    borderRadius: 8,
    controlHeight: 36,
  },
  components: {
    Modal: { contentBg: '#0f151e', headerBg: '#0f151e', titleColor: '#e2e8f0' },
    Input: { activeBorderColor: ACCENT.L, hoverBorderColor: ACCENT.L, activeShadow: '0 0 0 3px #4ade801f' },
    InputNumber: { activeBorderColor: ACCENT.L, hoverBorderColor: ACCENT.L },
    Select: { optionSelectedBg: '#18212c' },
    Tree: { nodeSelectedBg: '#18212c', nodeHoverBg: '#18212c', directoryNodeSelectedBg: '#18212c' },
    Popover: { colorBgElevated: '#0f151e' },
    Tooltip: { colorBgSpotlight: '#18212c', colorTextLightSolid: '#e2e8f0' },
    Message: { contentBg: '#0f151e' },
    Spin: { colorPrimary: ACCENT.L },
  },
}
