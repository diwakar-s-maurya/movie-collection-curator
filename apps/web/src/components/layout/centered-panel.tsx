import type { ReactNode } from 'react'

// The frame for the views that are a short column of text and one control:
// sign-in and not-found. The signed-in views use the wide `<main>` in
// `AuthedLayout` instead, and neither route component owns its own layout.
const CenteredPanel = ({ children }: { children: ReactNode }) => (
  <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-3 px-4 py-12">
    {children}
  </main>
)

export { CenteredPanel }
