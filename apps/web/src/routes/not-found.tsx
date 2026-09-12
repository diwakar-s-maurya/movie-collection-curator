import { Link } from '@tanstack/react-router'

import { CenteredPanel } from '@/components/layout/centered-panel'
import { Button } from '@/components/ui/button'

/**
 * "What you asked for is not here, and here is the way out." Two things reach
 * it: a URL the router does not recognise, and a collection the API answers
 * `NOT_FOUND` for. Neither is an error, so both get a screen rather than an
 * error boundary.
 *
 * The panel carries no page frame of its own: the router's not-found wraps it
 * in `CenteredPanel`, while a missing collection is rendered by a route already
 * inside the signed-in layout.
 */
const NotFoundPanel = ({
  title,
  description,
}: {
  title: string
  description: string
}) => (
  <div className="flex w-full max-w-sm flex-col gap-3">
    <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
    <p className="text-sm text-muted-foreground">{description}</p>
    <Button render={<Link to="/" />}>Back to collections</Button>
  </div>
)

// The router's default, so it sits above the guard: signed in or not, the one
// link that always works is the same.
const NotFound = () => (
  <CenteredPanel>
    <NotFoundPanel
      title="Not found"
      description="There is nothing at this address."
    />
  </CenteredPanel>
)

export { NotFound, NotFoundPanel }
