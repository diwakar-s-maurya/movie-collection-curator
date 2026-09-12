import { Link } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import type { Ref } from 'react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatRuntime } from '@/lib/format'
import type { CollectionSummary } from '@/lib/orpc'

type CollectionCardProps = {
  collection: CollectionSummary
  onDelete: () => void
  /** Where the route puts the focus after a create; see `focusCreated`. */
  linkRef?: Ref<HTMLAnchorElement>
}

/**
 * A collection on the list view. The numbers are the summary the list query
 * already carries, so a card costs no request of its own; the breakdowns are
 * the detail view's job.
 */
const CollectionCard = ({
  collection,
  onDelete,
  linkRef,
}: CollectionCardProps) => {
  const { movieCount, runtimeMinutes, ratedCount, averageRating } =
    collection.stats

  // An empty collection still says "0 films"; the rest is left out rather than
  // printed as a zero, which would read as a fact about the films.
  const facts = [
    `${movieCount} ${movieCount === 1 ? 'film' : 'films'}`,
    formatRuntime(runtimeMinutes),
    averageRating === null
      ? null
      : `${averageRating.toFixed(1)} avg (${ratedCount} rated)`,
  ].filter((fact) => fact !== null)

  return (
    <Card className="relative transition-colors hover:bg-muted/40">
      <CardHeader>
        <CardTitle>
          {/* The link covers the card, so the whole thing is the target and
              there is still exactly one link in the accessibility tree.
              `focus:` rather than `focus-visible:`: focus moved by script does
              not reliably count as focus-visible, and this ring is how a
              just-created card is marked. */}
          <Link
            ref={linkRef}
            to="/collections/$collectionId"
            params={{ collectionId: collection.id }}
            className="outline-none after:absolute after:inset-0 after:rounded-xl focus:after:ring-3 focus:after:ring-ring/50"
          >
            {collection.name}
          </Link>
        </CardTitle>
        {collection.description ? (
          <CardDescription className="line-clamp-2">
            {collection.description}
          </CardDescription>
        ) : null}
        <CardAction>
          {/* Above the link's overlay, or it would never be the click. */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 />
            <span className="sr-only">Delete {collection.name}</span>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="text-muted-foreground">
        {facts.join(' · ')}
      </CardContent>
    </Card>
  )
}

export { CollectionCard }
