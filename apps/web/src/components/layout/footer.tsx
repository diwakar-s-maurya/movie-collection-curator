/**
 * TMDB's required attribution, on every view including sign-in: their terms ask
 * for the line verbatim. The line only, without their logo mark, which is a
 * trademark with a branding guide of its own.
 */
const Footer = () => (
  <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-xs text-muted-foreground sm:px-6">
    This product uses the TMDB API but is not endorsed or certified by{' '}
    <a
      href="https://www.themoviedb.org"
      target="_blank"
      rel="noreferrer"
      className="rounded-sm underline underline-offset-2 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      TMDB
    </a>
    .
  </footer>
)

export { Footer }
