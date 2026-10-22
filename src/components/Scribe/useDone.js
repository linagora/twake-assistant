import { useCallback, useEffect, useRef, useState } from 'react'

const DONE_DURATION = 1500

/**
 * Whether the user has just acted: true for 1.5 s after each call of `markDone`
 *
 * @returns {[boolean, () => void]}
 */
export function useDone() {
  const [isDone, setIsDone] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const markDone = useCallback(() => {
    clearTimeout(timer.current)
    setIsDone(true)
    timer.current = setTimeout(() => setIsDone(false), DONE_DURATION)
  }, [])

  return [isDone, markDone]
}
