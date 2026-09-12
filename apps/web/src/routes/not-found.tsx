import { Link } from '@tanstack/react-router'

import { CenteredPanel } from '@/components/layout/centered-panel'
import { Button } from '@/components/ui/button'

// Any URL the router does not recognise. Signed in or not, the way out is the
// same, so this sits above the guard and offers the one link that always works.
const NotFound = () => (
  <CenteredPanel>
    <h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
    <p className="text-sm text-muted-foreground">
      There is nothing at this address.
    </p>
    <Button render={<Link to="/" />}>Back to collections</Button>
  </CenteredPanel>
)

export { NotFound }
