import { Outlet, useRouteContext } from '@tanstack/react-router'

import { Header } from '@/components/layout/header'

// Everything behind the guard. The user comes from the route context the guard
// returned, so the header costs no request of its own.
const AuthedLayout = () => {
  const { user } = useRouteContext({ from: '/_authed' })

  return (
    <>
      <Header user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <Outlet />
      </main>
    </>
  )
}

export { AuthedLayout }
