import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { type FormEvent, useState } from 'react'

import { ErrorText } from '@/components/error-text'
import { CenteredPanel } from '@/components/layout/centered-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { orpc } from '@/lib/orpc'

const SignIn = () => {
  const [name, setName] = useState('')
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const signIn = useMutation(
    orpc.auth.signIn.mutationOptions({
      onSuccess: async (user) => {
        // `signIn` and `me` answer with the same row, and the guard reads `me`
        // through this cache, whose last answer was the 401 that sent us here.
        // Writing the row replaces that error and saves a second request.
        queryClient.setQueryData(orpc.auth.me.queryKey(), user)
        await navigate({ to: '/' })
      },
    }),
  )

  const trimmed = name.trim()

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    signIn.mutate({ name: trimmed })
  }

  return (
    <CenteredPanel>
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="-mt-2 text-sm text-muted-foreground">
        No password. Pick any name. Use a second browser to try another user.
      </p>
      <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-3">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="alice"
          autoFocus
          autoComplete="username"
          maxLength={50}
        />
        <Button type="submit" disabled={!trimmed || signIn.isPending}>
          {signIn.isPending ? 'Signing in…' : 'Continue'}
        </Button>
        <ErrorText error={signIn.error} />
      </form>
    </CenteredPanel>
  )
}

export { SignIn }
