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
  fnRef.current = fn
  const timer = useRef<number>(undefined)

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
