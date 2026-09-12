import { useEffect, useState } from 'react'

/**
 * The value, held back until it has stopped changing for `delayMs`. The search
 * dialog passes the result as the query key, so a request fires once per pause
 * in the typing and a term typed before is answered from the cache.
 */
export function useDebouncedValue<Value>(value: Value, delayMs: number): Value {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs)

    // Every new keystroke cancels the pending timer, so only the last lands.
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return settled
}
