import { InputNumber } from 'antd'
import { useTranslation } from 'react-i18next'

interface Props {
  value: number
  onChange: (n: number) => void
  disabled?: boolean
}

/**
 * 跳数输入。整数、下限 1、**无上限** —— 上限交由服务端 nodeCap 兜底，
 * 并通过 meta.truncated 告知用户结果被截断了。
 */
export function HopsInput({ value, onChange, disabled }: Props) {
  const { t } = useTranslation()

  const commit = (raw: number | string | null) => {
    const n = Number(raw)
    if (!Number.isFinite(n)) return // 非法输入：保持原值，不回调
    onChange(Math.max(1, Math.floor(n)))
  }

  return (
    <InputNumber
      size="small"
      min={1}
      precision={0}
      step={1}
      value={value}
      disabled={disabled}
      controls={false}
      aria-label={t('panel.hops')}
      title={t('panel.hopsTip')}
      style={{ width: 46, textAlign: 'center' }}
      onBlur={(e) => commit((e.target as HTMLInputElement).value)}
      onPressEnter={(e) => commit((e.target as HTMLInputElement).value)}
    />
  )
}
