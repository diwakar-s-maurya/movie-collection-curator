import { authed, pub } from '../orpc.js'
import { signInInput, user } from '../schemas/auth.js'
import { ok } from '../schemas/common.js'
import * as authService from '../services/auth.js'
import { clearUserCookie, setUserCookie } from '../session.js'

export const authRouter = {
  signIn: pub
    .route({
      method: 'POST',
      path: '/auth/sign-in',
      summary: 'Sign in by name, creating the user if the name is new',
    })
    .input(signInInput)
    .output(user)
    .handler(async ({ input, context }) => {
      const signedIn = await authService.signIn(input.name)
      setUserCookie(context.resHeaders, signedIn.id)

      return signedIn
    }),

  signOut: pub
    .route({ method: 'POST', path: '/auth/sign-out', summary: 'Sign out' })
    .output(ok)
    .handler(({ context }) => {
      clearUserCookie(context.resHeaders)

      return { ok: true } as const
    }),

  me: authed
    .route({ method: 'GET', path: '/auth/me', summary: 'The signed-in user' })
    .output(user)
    .handler(({ context }) => context.user),
}
