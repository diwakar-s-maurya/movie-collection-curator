import type { ReactNode } from 'react'

// The title of a signed-in view, so the two views under the header agree.
const PageHeading = ({ children }: { children: ReactNode }) => (
  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
    {children}
  </h1>
)

export { PageHeading }
