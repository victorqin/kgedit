import { useEffect, useState } from 'react'
import { Spin } from 'antd'
import { useTranslation } from 'react-i18next'
import { useKgStore } from '@/stores/useKgStore'
import './blocking-overlay.css'

/** 快请求不该闪一下蒙层，超过这个时长才显示。 */
const SHOW_DELAY_MS = 250

/**
 * 写操作期间挡住全部交互，保证一次只有一个写请求在飞，
 * 并且后续的并行刷新也圈在同一个窗口里 —— 否则用户会看到
 * 「左图已更新、右图还是旧的」这种半截状态。
 */
export function BlockingOverlay() {
  const { t } = useTranslation()
  const blocking = useKgStore((s) => s.blocking)
  const [delayPassed, setDelayPassed] = useState(false)

  useEffect(() => {
    if (!blocking) return
    const timer = window.setTimeout(() => setDelayPassed(true), SHOW_DELAY_MS)
    return () => {
      window.clearTimeout(timer)
      setDelayPassed(false)
    }
  }, [blocking])

  // 派生而非另存一份状态：blocking 一落下就立刻隐藏，不必等 delayPassed 复位
  const visible = blocking && delayPassed

  // 请求已经发出去了，Esc 撤不回来，所以蒙层期间把它吞掉
  useEffect(() => {
    if (!blocking) return
    const swallow = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', swallow, true)
    return () => window.removeEventListener('keydown', swallow, true)
  }, [blocking])

  if (!visible) return null

  return (
    <div className="blocking-overlay" role="alert" aria-busy="true" aria-live="assertive">
      <div className="blocking-overlay__box">
        <Spin size="small" />
        <span>{t('toast.working')}</span>
      </div>
    </div>
  )
}
