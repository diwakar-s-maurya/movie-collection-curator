import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Clapperboard } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { orpc, type User } from '@/lib/orpc'

type HeaderProps = { user: User }

const Header = ({ user }: HeaderProps) => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const signOut = useMutation(
    orpc.auth.signOut.mutationOptions({
      onSuccess: async () => {
        // The whole cache, not just the user: the next one to sign in on this
        // tab must not see a frame of it. Navigate first, so nothing refetches
        // on the way out.
        await navigate({ to: '/sign-in' })
        queryClient.clear()
      },
    }),
  )

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <Clapperboard className="size-5" />
          Collections
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user.name}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut.mutate({})}
            disabled={signOut.isPending}
          >
            Sign out
          </Button>
        </div>
      </div>
    </header>
  )
}

export { Header }
