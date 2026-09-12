import type { ReactNode } from 'react'

type CenteredPanelProps = {
  children: ReactNode
  /** The element to be. `main` for a view that is the page, `div` for the
   * route error screen, which may render inside a `<main>` that already
   * exists and must not add a second landmark. */
  as?: 'main' | 'div'
}

// The frame for the views that are a short column of text and one control:
// sign-in, not-found and the route error screen. The signed-in views use the
// wide `<main>` in `AuthedLayout` instead.
const CenteredPanel = ({
  children,
  as: Element = 'main',
}: CenteredPanelProps) => (
  <Element className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-3 px-4 py-12">
    {children}
  </Element>
)

export { CenteredPanel }
