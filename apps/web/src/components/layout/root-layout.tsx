import { TanStackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

// The page shell and nothing else: the header belongs to the signed-in layout,
// since sign-in is the one view with no user to put in it.
const RootLayout = () => (
  <div className="flex min-h-screen flex-col">
    <Outlet />
    <TanStackDevtools
      plugins={[
        { name: 'TanStack Router', render: <TanStackRouterDevtoolsPanel /> },
        { name: 'TanStack Query', render: <ReactQueryDevtoolsPanel /> },
      ]}
    />
  </div>
)

export { RootLayout }
