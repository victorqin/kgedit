import { useEffect, useMemo, useRef } from 'react'

/**
 * 输入类请求的防抖。搜索框每敲一个字都会请求节点树，
 * 不防抖会在打字过程中打出一串无用请求。
 */
export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delay: number,
) {
  const fnRef = useRef(fn)
  const timer = useRef<number>(undefined)

  // 在 effect 里更新而非渲染期赋值：渲染期写 ref 会触发级联渲染告警。
  // 防抖回调总是在延迟之后才执行，那时 effect 早已跑完，不存在读到旧值的问题。
  useEffect(() => {
    fnRef.current = fn
  }, [fn])

  const debounced = useMemo(
    () =>
      (...args: A) => {
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => fnRef.current(...args), delay)
      },
    [delay],
  )

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return debounced
}
