/** 设计稿 `KG Studio.dc.html` 侧栏与顶栏的图标，原样移植。 */

export const LogoIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
    <circle cx="4" cy="4" r="2.6" fill="#4ade80" />
    <circle cx="14" cy="7" r="2.2" fill="#4ade80" opacity=".7" />
    <circle cx="6" cy="14" r="2.2" fill="#4ade80" opacity=".7" />
    <path d="M4 4 L14 7 M4 4 L6 14" stroke="#4ade80" strokeWidth="1.1" opacity=".8" />
  </svg>
)

export const GridIcon = ({ color }: { color: string }) => (
  <svg width="17" height="17" viewBox="0 0 17 17" fill={color} aria-hidden="true">
    <rect x="1" y="1" width="6.5" height="6.5" rx="1.6" />
    <rect x="9.5" y="1" width="6.5" height="6.5" rx="1.6" />
    <rect x="1" y="9.5" width="6.5" height="6.5" rx="1.6" />
    <rect x="9.5" y="9.5" width="6.5" height="6.5" rx="1.6" />
  </svg>
)

export const SearchIcon = ({ color, size = 17 }: { color: string; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 17 17"
    fill="none"
    stroke={color}
    strokeWidth="1.6"
    aria-hidden="true"
  >
    <circle cx="7.2" cy="7.2" r="5.2" />
    <path d="M11.2 11.2 L15.5 15.5" />
  </svg>
)

export const GraphIcon = ({ color }: { color: string }) => (
  <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
    <circle cx="4" cy="4" r="2.4" fill="none" stroke={color} strokeWidth="1.5" />
    <circle cx="14" cy="14" r="2.4" fill="none" stroke={color} strokeWidth="1.5" />
    <path d="M5.6 5.6 L12.4 12.4" stroke={color} strokeWidth="1.5" />
  </svg>
)

export const DatasetIcon = ({ color }: { color: string }) => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 17 17"
    fill="none"
    stroke={color}
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <rect x="1.2" y="2.5" width="14.6" height="12" rx="2" />
    <path d="M1.2 6.5 H15.8" />
  </svg>
)

export const SettingsIcon = ({ color }: { color: string }) => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 17 17"
    fill="none"
    stroke={color}
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <circle cx="8.5" cy="8.5" r="2.6" />
    <circle cx="8.5" cy="8.5" r="6.6" strokeDasharray="2.6 2.4" />
  </svg>
)

export const BoltIcon = () => (
  <svg width="15" height="15" viewBox="0 0 17 17" aria-hidden="true">
    <path d="M9.5 1 L3 9.6 H7.6 L7 16 L13.6 7.2 H9.2 Z" fill="#4ade80" />
  </svg>
)

export const TargetIcon = () => (
  <svg width="15" height="15" viewBox="0 0 17 17" fill="none" stroke="#60a5fa" strokeWidth="1.5" aria-hidden="true">
    <circle cx="8.5" cy="8.5" r="6.8" />
    <circle cx="8.5" cy="8.5" r="2.4" fill="#60a5fa" stroke="none" />
  </svg>
)

export const GlobeIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 17 17"
    fill="none"
    stroke="#8b97ab"
    strokeWidth="1.4"
    style={{ flex: 'none' }}
    aria-hidden="true"
  >
    <circle cx="8.5" cy="8.5" r="6.8" />
    <path d="M1.7 8.5H15.3 M8.5 1.7 C11 4.5 11 12.5 8.5 15.3 C6 12.5 6 4.5 8.5 1.7" />
  </svg>
)

export const WrenchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 17 17" fill="none" stroke="#8b97ab" strokeWidth="1.5" aria-hidden="true">
    <path d="M2 15 L7 10" />
    <path d="M9 8 L15 2 M11.5 1.5 L15.5 5.5 L13.5 7.5 L9.5 3.5 Z" fill="#8b97ab" />
  </svg>
)

export const LinkedIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M7.5 12.5 L12.5 7.5" />
    <path d="M4.5 9 L3 10.5 a3.5 3.5 0 0 0 5 5 L9.5 14" />
    <path d="M10.5 6 L12 4.5 a3.5 3.5 0 0 1 5 5 L15.5 11" />
  </svg>
)

export const UnlinkedIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M4.5 9 L3 10.5 a3.5 3.5 0 0 0 5 5 L9.5 14" />
    <path d="M10.5 6 L12 4.5 a3.5 3.5 0 0 1 5 5 L15.5 11" />
    <path d="M6.5 3.5 L13.5 16.5" stroke="#f87171" />
  </svg>
)
