import { useCallback, useState } from 'react'

/**
 * The height of the element the returned ref lands on, kept up to date as its
 * content changes. Set it on a parent that transitions `height` and a jump in
 * size becomes a slide.
 *
 * Undefined until the first measurement, so that parent stays `height: auto`
 * for its first paint rather than animating in from nothing.
 */
export function useContentHeight<Element extends HTMLElement>() {
  const [height, setHeight] = useState<number>()

  const ref = useCallback((node: Element | null) => {
    if (!node) return undefined

    const observer = new ResizeObserver(() =>
      setHeight(node.getBoundingClientRect().height),
    )
    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  return [ref, height] as const
}
