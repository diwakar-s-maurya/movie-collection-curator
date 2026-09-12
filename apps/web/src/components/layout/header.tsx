import { Link } from '@tanstack/react-router'
import { Clapperboard } from 'lucide-react'

const Header = () => (
  <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
    <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
      <Link
        to="/"
        className="flex items-center gap-2 font-semibold tracking-tight"
      >
        <Clapperboard className="size-5" />
        Collections
      </Link>
    </div>
  </header>
)

export { Header }
