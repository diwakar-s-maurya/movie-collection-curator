import { TanStackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

import { Toaster } from '@/components/ui/sonner'

// The page shell and nothing else: the header belongs to the signed-in layout,
// since sign-in is the one view with no user to put in it.
const RootLayout = () => (
  <div className="flex min-h-screen flex-col">
    <Outlet />
    {/* The app has one palette and nothing toggles `.dark`, so the theme is
        given rather than read: the CLI's Toaster asks `next-themes`, which
        without a provider falls back to the OS and would go dark under a light
        app. */}
    <Toaster theme="light" position="bottom-center" />
    <TanStackDevtools
      plugins={[
        { name: 'TanStack Router', render: <TanStackRouterDevtoolsPanel /> },
        { name: 'TanStack Query', render: <ReactQueryDevtoolsPanel /> },
      ]}
    />
  </div>
)

export { RootLayout }
