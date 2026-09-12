import { type ErrorComponentProps, useRouter } from '@tanstack/react-router'

import { CenteredPanel } from '@/components/layout/centered-panel'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/error-message'

/**
 * The last error screen in the app, and the one nothing else caught: the auth
 * guard rethrows anything that is not "you are not signed in" (`router.tsx`),
 * and a component that throws while rendering lands here too.
 *
 * Not where a failed list read goes — those are shown in place with a retry.
 * This is for the failure that leaves nothing to show.
 *
 * The same centred column as sign-in and not-found, as a `div`: one of the
 * routes it stands in for is already inside the signed-in layout's `<main>`.
 */
const RouteError = ({ error, reset }: ErrorComponentProps) => {
  const router = useRouter()

  return (
    <CenteredPanel as="div">
      <h1 className="text-2xl font-semibold tracking-tight">
        This page did not load.
      </h1>
      <p role="alert" className="text-sm text-muted-foreground">
        {errorMessage(error)}
      </p>
      <Button
        className="self-start"
        onClick={() => {
          // Both halves: the boundary forgets the error, and the router runs
          // the guard and loaders again. Without the second, the same failure
          // renders straight back.
          reset()
          void router.invalidate()
        }}
      >
        Try again
      </Button>
    </CenteredPanel>
  )
}

export { RouteError }
